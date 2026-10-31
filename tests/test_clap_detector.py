import threading
import unittest
from unittest.mock import patch

from voice.clap_detector import wait_for_double_clap
from agent import is_shutdown_phrase


class FakeStream:
    def __init__(self, *, callback, **_kwargs):
        self.callback = callback

    def __enter__(self):
        self.callback([[0.8]], 1, None, None)
        import time

        time.sleep(0.13)
        self.callback([[0.8]], 1, None, None)
        return self

    def __exit__(self, *_args):
        return False


class TestClapDetector(unittest.TestCase):
    def test_detects_two_claps(self):
        self.assertTrue(
            wait_for_double_clap(
                threading.Event(),
                stream_factory=FakeStream,
            )
        )

    def test_rejects_invalid_threshold(self):
        with self.assertRaises(ValueError):
            wait_for_double_clap(threading.Event(), threshold=1.1)

    def test_shutdown_phrase_is_normalized(self):
        self.assertTrue(is_shutdown_phrase(" OK   Jarvis  bye "))
        self.assertTrue(is_shutdown_phrase("okay jarvis bye"))
        self.assertFalse(is_shutdown_phrase("ok jarvis"))


if __name__ == "__main__":
    unittest.main()
