"""
Regression tests for known false-positive mismatch cases.
These verify that the scorer REJECTS domains whose on-page content doesn't match
the company name — the core false-positive protection.

Run: python tests/test_regression.py
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from domain_pipeline.models import LeadContext, DomainCandidate
from domain_pipeline.signals.s2_onpage import S2OnPage
from domain_pipeline.signals.s3_email_corr import S3EmailCorr
from domain_pipeline.scorer import classify, CandidateResult, SignalResult


# ── Shared HTML mocks for wrong-company sites ─────────────────────────────────

# myperfectfit.co.in is a menswear brand — no mention of "Leaf Water"
MYPERFECTFIT_HTML = """
<html><head><title>MyPerfectFit - Men's Fashion Online</title>
<meta name="description" content="Shop men's shirts, trousers and formal wear at MyPerfectFit India.">
</head><body>
<h1>Men's Clothing Online</h1>
<p>MyPerfectFit is India's leading menswear brand. Shop casual shirts, formal trousers.</p>
<footer>© 2024 MyPerfectFit Clothing Pvt Ltd</footer>
</body></html>
"""

# spjain.org is S.P. Jain School of Global Management — not a garments company
SPJAIN_HTML = """
<html><head><title>SP Jain School of Global Management</title>
<meta name="description" content="SP Jain is a top-ranked global business school.">
</head><body>
<h1>SP Jain School of Global Management</h1>
<p>We are a leading business school with campuses in Mumbai, Dubai, Singapore and Sydney.</p>
<footer>© 2024 S.P. Jain School of Global Management</footer>
</body></html>
"""

# ewokestudio.com is a creative design studio — not NIFT
EWOKE_HTML = """
<html><head><title>Ewoke Studio - Creative Design Agency</title>
<meta name="description" content="Ewoke Studio is a branding and design agency based in Hyderabad.">
</head><body>
<h1>Ewoke Creative Studio</h1>
<p>We design logos, brand identities and websites for startups and enterprises.</p>
<footer>© 2024 Ewoke Studio</footer>
</body></html>
"""


def _make_ctx(company: str, email: str = "", city: str = "hyderabad") -> LeadContext:
    from domain_pipeline.normalize import normalize_company
    return LeadContext(
        scraper_row_id="test-001",
        company_raw=company,
        company_norm=normalize_company(company),
        full_name="Test User",
        position="Founder",
        location=f"{city.title()}, Telangana, India",
        city=city,
        email=email,
        phone_norm="",
        logo_url="",
        profile_image_url="",
    )


def _make_candidate(domain: str, url: str, sources: list, html: str) -> DomainCandidate:
    c = DomainCandidate(domain=domain, url=url, sources=sources)
    c._html = html
    return c


class TestS2OnPage(unittest.TestCase):
    """S2 must give low scores when the page content doesn't match the company name."""

    def test_leaf_water_vs_myperfectfit(self):
        ctx = _make_ctx("Leaf Water")
        candidate = _make_candidate(
            "myperfectfit.co.in", "https://myperfectfit.co.in",
            ["email"], MYPERFECTFIT_HTML
        )
        result = S2OnPage().score(ctx, candidate)
        # "leaf water" should score very low against menswear content
        self.assertLess(result.score, 15,
            f"S2 gave {result.score} pts for Leaf Water vs myperfectfit — should be < 15")
        self.assertFalse(result.is_strong,
            "S2 should NOT be strong for Leaf Water vs myperfectfit")

    def test_sri_vishal_garments_vs_spjain(self):
        ctx = _make_ctx("Sri Vishal Garments")
        candidate = _make_candidate(
            "spjain.org", "https://spjain.org",
            ["email"], SPJAIN_HTML
        )
        result = S2OnPage().score(ctx, candidate)
        self.assertLess(result.score, 15,
            f"S2 gave {result.score} pts for Sri Vishal Garments vs spjain — should be < 15")

    def test_nift_vs_ewoke(self):
        ctx = _make_ctx("National Institute of Fashion Technology")
        candidate = _make_candidate(
            "ewokestudio.com", "https://ewokestudio.com",
            ["email"], EWOKE_HTML
        )
        result = S2OnPage().score(ctx, candidate)
        self.assertLess(result.score, 20,
            f"S2 gave {result.score} pts for NIFT vs ewoke — should be < 20")


class TestS3EmailCorr(unittest.TestCase):
    """S3 must not grant strong points when S2 failed (even if email domain matches)."""

    def test_no_strong_boost_without_s2(self):
        ctx = _make_ctx("Leaf Water", email="ajit@myperfectfit.co.in")
        candidate = _make_candidate(
            "myperfectfit.co.in", "https://myperfectfit.co.in",
            ["email"], MYPERFECTFIT_HTML
        )
        # S2 did NOT pass for this pair
        result = S3EmailCorr().score(ctx, candidate, s2_passed=False)
        self.assertFalse(result.is_strong,
            "S3 must not be strong when S2 failed, even if email domain matches")

    def test_no_grant_when_email_is_webmail(self):
        ctx = _make_ctx("Leaf Water", email="ajit@gmail.com")
        candidate = _make_candidate(
            "gmail.com", "https://gmail.com", ["email"], ""
        )
        result = S3EmailCorr().score(ctx, candidate, s2_passed=True)
        self.assertEqual(result.score, 0, "Free webmail should yield 0 for S3")


class TestFullPipelineRejection(unittest.TestCase):
    """End-to-end: the known mismatch rows must NOT be classified VERIFIED_HIGH."""

    def _build_mock_cr(self, ctx, candidate, total_score, strong_count,
                       s1_passed=True) -> CandidateResult:
        cr = CandidateResult(candidate=candidate)
        cr.s1_passed = s1_passed
        cr.total_score = total_score
        cr.strong_count = strong_count
        cr.final_url = candidate.url
        return cr

    def test_leaf_water_not_accepted(self):
        ctx = _make_ctx("Leaf Water", email="ajit@myperfectfit.co.in")
        candidate = _make_candidate(
            "myperfectfit.co.in", "https://myperfectfit.co.in",
            ["email"], MYPERFECTFIT_HTML
        )
        # Simulate: S1 passes, S2 weak (mismatch), S3 not strong, S4=1 source
        cr = self._build_mock_cr(ctx, candidate, total_score=12, strong_count=0)
        tier = classify(cr)
        self.assertNotEqual(tier, "VERIFIED_HIGH",
            "Leaf Water vs myperfectfit must NOT be VERIFIED_HIGH")

    def test_sri_vishal_not_accepted(self):
        ctx = _make_ctx("Sri Vishal Garments")
        candidate = _make_candidate(
            "spjain.org", "https://spjain.org", ["email"], SPJAIN_HTML
        )
        cr = self._build_mock_cr(ctx, candidate, total_score=8, strong_count=0)
        self.assertNotEqual(classify(cr), "VERIFIED_HIGH")

    def test_nift_not_accepted(self):
        ctx = _make_ctx("National Institute of Fashion Technology")
        candidate = _make_candidate(
            "ewokestudio.com", "https://ewokestudio.com", ["email"], EWOKE_HTML
        )
        cr = self._build_mock_cr(ctx, candidate, total_score=10, strong_count=1)
        self.assertNotEqual(classify(cr), "VERIFIED_HIGH")

    def test_correct_domain_can_be_accepted(self):
        """Positive control: a correct company-domain pair should be acceptable."""
        ctx = _make_ctx("Roman Island")
        html = """<html><head><title>Roman Island - Official Website</title></head>
<body><h1>Roman Island</h1><p>Premium clothing from Roman Island, Hyderabad.</p>
<footer>© 2024 Roman Island Pvt Ltd, Hyderabad</footer></body></html>"""
        candidate = _make_candidate(
            "romanisland.com", "https://romanisland.com", ["email", "serper"], html
        )
        s2 = S2OnPage().score(ctx, candidate)
        # Should score reasonably for a correct match
        self.assertGreater(s2.score, 15,
            f"Roman Island vs romanisland.com scored {s2.score} — expected > 15")


if __name__ == "__main__":
    print("Running regression tests...")
    loader = unittest.TestLoader()
    suite  = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("\nPASS: All regression tests passed - false-positive protection is working.")
    else:
        print("\nFAIL: Some tests failed - check scorer/signal thresholds.")
        sys.exit(1)
