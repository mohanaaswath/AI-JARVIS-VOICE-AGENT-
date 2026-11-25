// voice.ts — Browser-based Web Speech API and Web Audio Analyzer engine
import type { VoiceSettings } from "../types";

export interface VoiceEngineStatus {
  isSupported: boolean;
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  error: string | null;
}

export type TranscriptHandler = (transcript: string, isFinal: boolean) => void;
export type StateChangeHandler = (status: VoiceEngineStatus) => void;
export type VolumeChangeHandler = (volume: number) => void;

class VoiceEngine {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private currentError: string | null = null;

  private transcriptCallback: TranscriptHandler | null = null;
  private stateCallback: StateChangeHandler | null = null;
  private volumeCallback: VolumeChangeHandler | null = null;

  private settings: VoiceSettings = {
    voiceURI: "",
    lang: "en-US",
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoSpeak: true,
    continuousListening: false,
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.synthesis = window.speechSynthesis || null;

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        null;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.settings.lang;

        this.recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript.trim()) {
            this.transcriptCallback?.(finalTranscript.trim(), true);
          } else if (interimTranscript.trim()) {
            this.transcriptCallback?.(interimTranscript.trim(), false);
          }
        };

        this.recognition.onerror = (event: any) => {
          // 'no-speech' is routine, don't treat as fatal
          if (event.error !== "no-speech") {
            this.currentError = `Speech recognition error: ${event.error}`;
            this.notifyState();
          }
        };

        this.recognition.onend = () => {
          if (this.isListening && this.settings.continuousListening && !this.isPaused) {
            try {
              this.recognition.start();
            } catch {
              this.isListening = false;
              this.stopAudioAnalysis();
              this.notifyState();
            }
          } else {
            this.isListening = false;
            this.stopAudioAnalysis();
            this.notifyState();
          }
        };
      }
    }
  }

  public updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (this.recognition && newSettings.lang) {
      this.recognition.lang = newSettings.lang;
    }
  }

  public onTranscript(callback: TranscriptHandler) {
    this.transcriptCallback = callback;
  }

  public onStateChange(callback: StateChangeHandler) {
    this.stateCallback = callback;
    this.notifyState();
  }

  public onVolumeChange(callback: VolumeChangeHandler) {
    this.volumeCallback = callback;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  public async startListening(): Promise<boolean> {
    if (!this.recognition) {
      this.currentError = "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.";
      this.notifyState();
      return false;
    }

    // Stop speaking if assistant is speaking
    this.stopSpeaking();

    try {
      this.recognition.start();
      this.isListening = true;
      this.isPaused = false;
      this.currentError = null;
      await this.startAudioAnalysis();
      this.notifyState();
      return true;
    } catch (err: any) {
      this.isListening = false;
      this.currentError = `Microphone access error: ${err.message || err}`;
      this.notifyState();
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.isPaused = false;
      try {
        this.recognition.stop();
      } catch {}
      this.stopAudioAnalysis();
      this.notifyState();
    }
  }

  public pause() {
    this.isPaused = true;
    if (this.isSpeaking && this.synthesis) {
      this.synthesis.pause();
    }
    if (this.isListening && this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.notifyState();
  }

  public resume() {
    this.isPaused = false;
    if (this.isSpeaking && this.synthesis) {
      this.synthesis.resume();
    }
    if (this.settings.continuousListening && this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch {}
    }
    this.notifyState();
  }

  public speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      this.stopSpeaking();

      // Clean markdown symbols for cleaner TTS speech
      const cleanText = text
        .replace(/```[\s\S]*?```/g, "Code block omitted.")
        .replace(/[*_#`~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "link")
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = this.settings.lang || "en-US";
      utterance.rate = this.settings.rate || 1.0;
      utterance.pitch = this.settings.pitch || 1.0;
      utterance.volume = this.settings.volume || 1.0;

      // Select specific voice if configured
      if (this.settings.voiceURI) {
        const voices = this.synthesis.getVoices();
        const selected = voices.find((v) => v.voiceURI === this.settings.voiceURI);
        if (selected) {
          utterance.voice = selected;
        }
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.notifyState();
        this.simulateSpeakingAudio();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.volumeCallback?.(0);
        this.notifyState();
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.volumeCallback?.(0);
        this.notifyState();
        resolve();
      };

      this.synthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.volumeCallback?.(0);
    this.notifyState();
  }

  private notifyState() {
    this.stateCallback?.({
      isSupported: Boolean(this.recognition || this.synthesis),
      hasSpeechRecognition: Boolean(this.recognition),
      hasSpeechSynthesis: Boolean(this.synthesis),
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      error: this.currentError,
    });
  }

  // ── Web Audio API Visualizer ────────────────────────────────────────────────

  private async startAudioAnalysis() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const loop = () => {
        if (!this.analyser || !this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1.0, avg / 128.0);
        this.volumeCallback?.(normalized);
        this.animFrameId = requestAnimationFrame(loop);
      };

      loop();
    } catch {
      // Audio visualizer fallback if permissions restricted
    }
  }

  private stopAudioAnalysis() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.volumeCallback?.(0);
  }

  private simulateSpeakingAudio() {
    if (!this.isSpeaking) return;
    const interval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(interval);
        this.volumeCallback?.(0);
        return;
      }
      // Audio reactive fluctuation for speaking animation
      const val = 0.25 + Math.random() * 0.65;
      this.volumeCallback?.(val);
    }, 100);
  }
}

export const voiceEngine = new VoiceEngine();
