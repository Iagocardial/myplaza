import { Room, RoomEvent, Track } from 'livekit-client'

let room = null

export async function connectVoice(url, token) {
  if (room) return room

  if (typeof window !== 'undefined' && !navigator.mediaDevices) {
    throw new Error(
      'Microfone bloqueado: acesse via HTTPS ou localhost, ou ative a flag chrome://flags/#unsafely-treat-insecure-origin-as-secure para este endereço.',
    )
  }

  room = new Room({
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  // Attach DOM elements only to trigger browser autoplay policy bypass.
  // IMPORTANT: el.volume has zero effect in LiveKit SDK v2.x because the SDK
  // routes audio through WebAudio (AudioContext), not through the HTML element.
  // Volume must be controlled via participant.setVolume() — see setParticipantVolume().
  room.on(RoomEvent.TrackSubscribed, (track, _pub, _participant) => {
    if (track.kind !== Track.Kind.Audio) return
    const el = track.attach()
    el.setAttribute('data-livekit', 'audio')
    document.body.appendChild(el)
    el.play().catch(() => {})
  })

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    if (track.kind !== Track.Kind.Audio) return
    track.detach().forEach((el) => el.remove())
  })

  // startAudio initialises the AudioContext — must be called within a user gesture.
  room.startAudio().catch(() => {})

  await room.connect(url, token)
  await room.localParticipant.setMicrophoneEnabled(true)

  return room
}

export function getLiveKitRoom() {
  return room
}

export function setMicEnabled(enabled) {
  if (!room) return
  room.localParticipant.setMicrophoneEnabled(enabled)
}

export async function startScreenShare() {
  if (!room) return
  await room.localParticipant.setScreenShareEnabled(true)
}

export async function stopScreenShare() {
  if (!room) return
  await room.localParticipant.setScreenShareEnabled(false)
}

export function disconnectVoice() {
  if (!room) return
  room.disconnect()
  room = null
  document.querySelectorAll('[data-livekit="audio"]').forEach((el) => el.remove())
}

// Controls playback volume (0–1) for a remote participant identified by their LiveKit identity
// (= Supabase user ID). In SDK v2.x, room.remoteParticipants is keyed by identity directly.
// participant.setVolume() drives the WebAudio gain node — the only API that actually works
// when the AudioContext pipeline is active.
export function setParticipantVolume(identity, volume) {
  if (!room) return
  const participant = room.remoteParticipants.get(identity)
  if (participant) {
    participant.setVolume(Math.max(0, Math.min(1, volume)))
  }
}

export function onParticipantEvent(event, handler) {
  if (!room) return
  room.on(event, handler)
  return () => room?.off(event, handler)
}

export function onActiveSpeakersChanged(handler) {
  if (!room) return () => {}
  room.on(RoomEvent.ActiveSpeakersChanged, handler)
  return () => room?.off(RoomEvent.ActiveSpeakersChanged, handler)
}
