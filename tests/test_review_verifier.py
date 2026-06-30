import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from domain_pipeline.models import CandidateResult, DomainCandidate, LeadContext, SignalResult
from domain_pipeline.normalize import normalize_company, normalize_phone
from verify_review_websites import CandidateDecision, SiteEvidence, _choose_row_verdict, build_candidate_decision


def _ctx(company: str, full_name: str = "Test User", location: str = "Hyderabad, Telangana, India",
         email: str = "", phone: str = "") -> LeadContext:
    return LeadContext(
        scraper_row_id="row-1",
        company_raw=company,
        company_norm=normalize_company(company),
        full_name=full_name,
        position="Founder",
        location=location,
        city="hyderabad",
        email=email,
        phone_norm=normalize_phone(phone),
        logo_url="",
        profile_image_url="",
    )


def _cr(candidate: DomainCandidate, signals: list[SignalResult], total_score: int = 60) -> CandidateResult:
    cr = CandidateResult(candidate=candidate)
    cr.signals = signals
    cr.total_score = total_score
    cr.strong_count = sum(1 for s in signals if s.is_strong)
    cr.s1_passed = True
    cr.final_url = candidate.url
    return cr


def _sig(signal_id: str, score: int, evidence: str, is_strong: bool = False) -> SignalResult:
    return SignalResult(
        signal_id=signal_id,
        score=score,
        max_score=score,
        passed=score > 0 or signal_id == "S1",
        evidence=evidence,
        is_strong=is_strong,
    )


class TestReviewVerifier(unittest.TestCase):
    def test_accept_when_phone_matches_and_company_is_prominent(self):
        ctx = _ctx("Roman Island", phone="+91 98765 43210")
        candidate = DomainCandidate("romanisland.com", "https://romanisland.com", ["name_guess"])
        cr = _cr(candidate, [
            _sig("S1", 0, "live"),
            _sig("S2", 30, "name in title+body", is_strong=True),
            _sig("S6", 8, "city(hyderabad)"),
        ], total_score=68)
        site = SiteEvidence(
            final_url="https://romanisland.com",
            title="Roman Island",
            text="roman island premium clothing hyderabad contact 9876543210",
            emails=set(),
            phone_norms={"9876543210"},
            page_urls=["https://romanisland.com"],
        )
        decision = build_candidate_decision(ctx, candidate, cr, site)
        self.assertEqual(decision.verdict, "ACCEPT")

    def test_uncertain_without_lead_specific_proof(self):
        ctx = _ctx("Pawgram")
        candidate = DomainCandidate("pawgram.in", "https://pawgram.in", ["name_guess"])
        cr = _cr(candidate, [
            _sig("S1", 0, "live"),
            _sig("S2", 28, "name in title+body", is_strong=True),
        ], total_score=52)
        site = SiteEvidence(
            final_url="https://pawgram.in",
            title="PawGram",
            text="pawgram pet adoption platform welcome to pawgram",
            emails=set(),
            phone_norms=set(),
            page_urls=["https://pawgram.in"],
        )
        decision = build_candidate_decision(ctx, candidate, cr, site)
        self.assertEqual(decision.verdict, "UNCERTAIN")

    def test_reject_generic_single_word_institutional_match(self):
        ctx = _ctx("Sameer")
        candidate = DomainCandidate("sameer.gov.in", "https://sameer.gov.in", ["clearbit"])
        cr = _cr(candidate, [
            _sig("S1", 0, "live"),
            _sig("S2", 30, "name in title+body", is_strong=True),
            _sig("S6", 4, "india-term(india)"),
        ], total_score=51)
        site = SiteEvidence(
            final_url="https://sameer.gov.in",
            title="SAMEER",
            text=(
                "sameer society for applied microwave electronics engineering and research "
                "ministry of electronics and information technology government of india"
            ),
            emails=set(),
            phone_norms=set(),
            page_urls=["https://sameer.gov.in"],
        )
        decision = build_candidate_decision(ctx, candidate, cr, site)
        self.assertEqual(decision.verdict, "REJECT")

    def test_multiple_accepted_domains_become_uncertain(self):
        decisions = [
            CandidateDecision("ACCEPT", "https://foo.com", 90, "a", "phone", 70, "S2"),
            CandidateDecision("ACCEPT", "https://foo.in", 84, "b", "email", 66, "S2"),
        ]
        final = _choose_row_verdict(decisions)
        self.assertEqual(final.verdict, "UNCERTAIN")


if __name__ == "__main__":
    unittest.main(verbosity=2)
