import unittest
import network_incident_copilot as nic


class GuardrailTests(unittest.TestCase):
    def test_timeout_is_not_down(self):
        facts = nic.analyze(nic.parse_cli("SSH TIMEOUT\nCOLLECTION_ERROR: timeout"))
        codes = {x.code for x in facts.findings}
        self.assertIn("COLLECTION_FAILED", codes)
        self.assertNotIn("MM_REPORTED_DOWN", codes)

    def test_explicit_mm_down(self):
        facts = nic.analyze(nic.parse_cli("192.0.2.20 DOWN"))
        self.assertIn("MM_REPORTED_DOWN", {x.code for x in facts.findings})

    def test_dynamic_role_stays_unknown(self):
        facts = nic.analyze(nic.parse_cli("dynamic_radius_role: true"))
        self.assertIn("DYNAMIC_ROLE_UNKNOWN", {x.code for x in facts.findings})

    def test_station_missing_not_session_closed(self):
        facts = nic.analyze(nic.parse_cli("STA not found"))
        self.assertIn("STA_NOT_FOUND", {x.code for x in facts.findings})

    def test_skew_is_signal_only(self):
        text = "192.0.2.11 active=120 standby=10\n192.0.2.12 active=10 standby=100"
        facts = nic.analyze(nic.parse_cli(text))
        self.assertIn("CLIENT_DISTRIBUTION_SKEW", {x.code for x in facts.findings})


if __name__ == "__main__":
    unittest.main()
