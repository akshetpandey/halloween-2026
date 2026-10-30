"""Public source evidence must not carry signed/private URL parameters."""
import unittest

from export_final import public_source_url


class PublicSourceTests(unittest.TestCase):
    def test_public_identity_is_preserved_and_other_parameters_are_dropped(self):
        expected='https://www.youtube.com/watch?v=abcdefgh_12'
        for source in ['https://youtu.be/abcdefgh_12?token=private',
                       'https://music.youtube.com/watch?v=abcdefgh_12&signature=private']:
            self.assertEqual(public_source_url(source),expected)

    def test_private_hosts_credentials_and_malformed_ids_fail_closed(self):
        for source in ['http://youtube.com/watch?v=abcdefgh_12',
                       'https://user:secret@youtube.com/watch?v=abcdefgh_12',
                       'https://example.com/private.mp3?token=secret',
                       'https://youtube.com/watch?v=bad']:
            with self.assertRaises(ValueError):public_source_url(source)
