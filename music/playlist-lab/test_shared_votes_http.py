"""Exercise hosted routing with a fake identity verifier, not real Access tokens."""
import http.server
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

import lab


class SharedVoteHTTPTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        store = lab.Store(self.tmp.name)
        with store.db:
            store.put({'id': 'a', 'title': 'Test', 'artist': 'Test'})
        store.vote_as('friend', 'a', 'up', 'friend note')
        store.db.close()
        ready = threading.Event()
        real_server = http.server.HTTPServer

        def server_factory(address, handler):
            self.server = real_server(('127.0.0.1', 0), handler)
            ready.set()
            return self.server

        class Verifier:
            def email(self, token):
                if token not in ('host', 'friend', 'other'):
                    raise ValueError('No test identity')
                return token

        def run():
            current = lab.Store(self.tmp.name)
            try:
                lab.serve(current, 0, 'https://review.example', Verifier(), 'host')
            finally:
                current.db.close()

        self.patch = patch('lab.http.server.HTTPServer', side_effect=server_factory)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.thread = threading.Thread(target=run, daemon=True)
        self.thread.start()
        self.assertTrue(ready.wait(3))
        self.addCleanup(self.stop)
        self.url = 'http://127.0.0.1:' + str(self.server.server_address[1])
        self.csrf = self.request('/api/tracks')[1]['csrf']

    def stop(self):
        self.server.shutdown()
        self.thread.join(3)
        self.assertFalse(self.thread.is_alive())

    def request(self, path, who='host', body=None, host='review.example', origin='https://review.example'):
        headers = {'Host': host, 'Origin': origin, 'Cf-Access-Jwt-Assertion': who}
        if body is not None:
            headers.update({'Content-Type': 'application/json', 'X-CSRF-Token': self.csrf})
        request = urllib.request.Request(self.url + path, headers=headers,
                                         data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            try:
                try:
                    return error.code, json.load(error)
                except ValueError:
                    return error.code, None
            finally:
                error.close()

    def test_same_decision_for_everyone_with_private_notes_and_authoritative_post(self):
        for who in ('host', 'friend', 'other'):
            row = self.request('/api/tracks', who)[1]['tracks'][0]
            self.assertEqual(row['vote'], 'up')
            self.assertEqual(row['reason'], 'friend note' if who == 'friend' else '')
        status, data = self.request('/api/note', body={'review_version': 2, 'id': 'a', 'reason': 'host observation'})
        self.assertEqual(status, 200)
        self.assertEqual(data['track']['personal_vote'], 'unrated')
        self.assertEqual(data['track']['vote'], 'up')
        self.request('/api/vote', body={'review_version': 2, 'id': 'a', 'vote': 'down'})
        status, data = self.request('/api/vote', 'friend', {'review_version': 2, 'id': 'a', 'vote': 'up'})
        self.assertEqual(status, 200)
        self.assertEqual(data['track']['vote'], 'down')
        self.assertEqual(data['track']['personal_vote'], 'up')
        self.assertEqual(data['track']['vote_origin'], 'host')

    def test_guards_still_require_identity_host_origin_csrf_and_current_ui(self):
        self.assertEqual(self.request('/api/tracks', who='')[0], 401)
        self.assertEqual(self.request('/api/tracks', host='wrong.example')[0], 403)
        self.assertEqual(self.request('/api/reviewers', 'friend')[0], 403)
        self.assertEqual(self.request('/api/reviewers')[0], 200)
        body = {'review_version': 2, 'id': 'a', 'vote': 'down'}
        self.assertEqual(self.request('/api/vote', body=body, origin='https://wrong.example')[0], 403)
        current = self.csrf;self.csrf = 'wrong'
        self.assertEqual(self.request('/api/vote', body=body)[0], 403)
        self.csrf = current
        status, data = self.request('/api/vote', body={'id': 'a', 'vote': 'down'})
        self.assertEqual(status, 400)
        self.assertIn('Refresh the page', data['error'])
        self.assertEqual(self.request('/api/tracks')[1]['tracks'][0]['vote'], 'up')


if __name__ == '__main__':
    unittest.main()
