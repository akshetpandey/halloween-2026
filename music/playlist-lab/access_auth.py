"""Validate Cloudflare Access application tokens at the Playlist Lab origin."""

from urllib.parse import urlparse
from urllib.error import URLError

import jwt
from jwt import PyJWKClient


class AccessVerifier:
    def __init__(self, team_domain, audience):
        parsed = urlparse(team_domain)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.path not in ('', '/') or not audience:
            raise ValueError('Invalid Cloudflare Access configuration')
        self.issuer = team_domain.rstrip('/')
        self.audience = audience
        self.keys = PyJWKClient(f'{self.issuer}/cdn-cgi/access/certs', cache_jwk_set=True, lifespan=300)

    def email(self, token):
        if not token:
            raise ValueError('Missing Access token')
        try:
            key = self.keys.get_signing_key_from_jwt(token)
            claims = jwt.decode(token, key.key, algorithms=['RS256'], audience=self.audience,
                issuer=self.issuer, options={'require': ['exp', 'iat', 'sub', 'email', 'aud', 'iss']})
        except (jwt.PyJWTError, URLError, TimeoutError, OSError, ValueError) as exc:
            raise ValueError('Invalid Access token') from exc
        if claims.get('type') != 'app' or not isinstance(claims.get('email'), str):
            raise ValueError('Expected an Access user session')
        email = claims['email'].strip().casefold()
        if not email or '@' not in email:
            raise ValueError('Access identity has no email')
        return email
