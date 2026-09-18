import unittest
from security_check import ActiveContent, content_problems, path_problem


class BaselineTests(unittest.TestCase):
    def test_env_files_rejected(self):
        for name in [".env", ".env.production", "private/.env.local"]:
            self.assertIsNotNone(path_problem(name))

    def test_placeholder_env_allowed(self):
        self.assertIsNone(path_problem(".env.example"))

    def test_private_exports_rejected(self):
        for name in ["RFQs.xlsx", "customers.csv", "mail.mbox", "backup.zip", "service-account.json", "id_rsa"]:
            self.assertIsNotNone(path_problem(name))

    def test_public_assets_allowed(self):
        for name in ["index.html", "js/buyer-rfq.js", "i18n/ar.json", "downloads/catalogue.pdf", "logo.png"]:
            self.assertIsNone(path_problem(name))

    def test_internal_register_rejected(self):
        self.assertIsNotNone(path_problem("Euro_Agri_Security_Register_2026.md"))

    def test_detects_tokens_without_echoing_value(self):
        sample = "ghp_" + "A" * 36
        findings = content_problems(sample)
        self.assertEqual(findings, ["GitHub token"])
        self.assertNotIn(sample, str(findings))

    def test_private_key_detected(self):
        sample = "-----BEGIN " + "PRIVATE KEY-----"
        self.assertEqual(content_problems(sample), ["private key"])

    def test_public_identifiers_are_not_secrets(self):
        self.assertEqual(content_problems("https://script.google.com/macros/s/public-deployment/exec G-6XRD7YWF4S"), [])

    def test_http_active_resources_rejected(self):
        parser = ActiveContent()
        parser.feed('<script src="http://example.com/a.js"></script>')
        self.assertEqual(len(parser.problems), 1)

    def test_relative_and_https_resources_allowed(self):
        parser = ActiveContent()
        parser.feed('<script src="js/local.js"></script><script src="https://example.com/a.js"></script>')
        self.assertEqual(parser.problems, [])

    def test_external_forms_require_post(self):
        parser = ActiveContent()
        parser.feed('<form action="https://script.google.com/macros/s/id/exec"></form>')
        self.assertEqual(len(parser.problems), 1)

    def test_https_post_form_allowed(self):
        parser = ActiveContent()
        parser.feed('<form method="POST" action="https://script.google.com/macros/s/id/exec"></form>')
        self.assertEqual(parser.problems, [])


if __name__ == "__main__":
    unittest.main()
