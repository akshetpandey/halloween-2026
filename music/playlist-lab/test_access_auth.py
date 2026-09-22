import time
import unittest
from unittest.mock import patch

try:
    import jwt
    from cryptography.hazmat.primitives.asymmetric import rsa
    import access_auth
except ImportError:
    jwt = None


@unittest.skipIf(jwt is None, 'Hosted dependency is not installed')
class AccessTests(unittest.TestCase):
    def setUp(self):
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.issuer = 'https://computer-toolbox.cloudflareaccess.com'
        self.verifier = access_auth.AccessVerifier(self.issuer, 'music-audience')
        self.verifier.keys.get_signing_key_from_jwt = lambda token: type('Key', (), {'key':self.key.public_key()})()

    def token(self, **changes):
        claims = {'iss':self.issuer, 'aud':'music-audience', 'sub':'identity',
            'email':' Guest@Example.com ', 'type':'app', 'iat':int(time.time())-5, 'exp':int(time.time())+60}
        claims.update(changes)
        return jwt.encode(claims, self.key, algorithm='RS256')

    def test_accepts_signed_access_app_identity(self):
        self.assertEqual(self.verifier.email(self.token()), 'guest@example.com')

    def test_rejects_wrong_audience_issuer_type_and_expiry(self):
        for changes in ({'aud':'other'}, {'iss':'https://other.example'}, {'type':'org'}, {'exp':int(time.time())-1}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.verifier.email(self.token(**changes))
        with self.assertRaises(ValueError): self.verifier.email('')
        with self.assertRaises(ValueError): self.verifier.email(self.token() + 'tampered')


if __name__ == '__main__': unittest.main()
