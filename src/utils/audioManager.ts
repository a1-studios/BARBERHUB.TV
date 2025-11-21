/**
 * Audio Manager for Battle Sound Effects
 * Manages sound playback with volume control and preloading
 */

type SoundName = 'vote' | 'like' | 'follow' | 'donate' | 'combo2' | 'combo5' | 'combo10' | 'winner' | 'reaction';

class AudioManagerClass {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundName, HTMLAudioElement> = new Map();
  private volume: number = 0.7;
  private muted: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    const savedVolume = localStorage.getItem('battleAudioVolume');
    const savedMuted = localStorage.getItem('battleAudioMuted');
    
    if (savedVolume) this.volume = parseFloat(savedVolume);
    if (savedMuted) this.muted = savedMuted === 'true';
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Preload sound effects for instant playback
   */
  preloadSounds() {
    // Using data URLs for lightweight sound effects
    // In production, replace with actual audio files
    const soundUrls: Record<SoundName, string> = {
      vote: this.generateTone(800, 0.05, 'sine'),
      like: this.generateTone(1200, 0.1, 'sine'),
      follow: this.generateTone(1000, 0.15, 'triangle'),
      donate: this.generateTone(1500, 0.2, 'square'),
      combo2: this.generateTone(1000, 0.1, 'sine'),
      combo5: this.generateTone(1200, 0.15, 'sine'),
      combo10: this.generateTone(1500, 0.2, 'sine'),
      winner: this.generateTone(2000, 0.5, 'sine'),
      reaction: this.generateTone(900, 0.08, 'sine'),
    };

    Object.entries(soundUrls).forEach(([name, url]) => {
      const audio = new Audio(url);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds.set(name as SoundName, audio);
    });
  }

  /**
   * Generate a simple tone for sound effects
   */
  private generateTone(frequency: number, duration: number, type: OscillatorType): string {
    // Return a data URL representing a simple beep
    // In production, use actual audio files
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSR';
  }

  /**
   * Play a sound effect
   */
  play(soundName: SoundName, volumeOverride?: number) {
    if (this.muted) return;

    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    // Clone the audio element to allow overlapping sounds
    const clone = sound.cloneNode() as HTMLAudioElement;
    clone.volume = volumeOverride !== undefined ? volumeOverride : this.volume;
    
    clone.play().catch(err => {
      console.warn('Audio play failed:', err);
    });
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('battleAudioVolume', this.volume.toString());
    
    // Update all preloaded sounds
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('battleAudioMuted', this.muted.toString());
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }
}

// Export singleton instance
export const AudioManager = new AudioManagerClass();
