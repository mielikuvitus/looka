// Raw WebRTC plumbing for OpenAI Realtime. Framework-agnostic: the hook owns
// state, this file owns the peer connection. No dependencies beyond the browser.
//
// Flow: mic → RTCPeerConnection → data channel ("oai-events") → SDP offer POSTed
// to OpenAI → answer applied. After that, audio streams directly both ways and
// our server is out of the loop.

export interface RealtimeHandle {
  stop: () => void
}

export interface RealtimeEvent {
  type: string
  [key: string]: unknown
}

export interface ConnectOptions {
  /** Ephemeral client secret from POST /api/frank/realtime-token. */
  token: string
  /** Realtime model id, e.g. "gpt-realtime-2". */
  model: string
  /** Frank's persona, re-asserted once the channel opens. */
  instructions: string
  /** Element the assistant's audio plays through. */
  audioEl: HTMLAudioElement
  /** Called for every event on the data channel. */
  onEvent: (event: RealtimeEvent) => void
  /** Called once the data channel is open (session is live). */
  onOpen: () => void
}

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls'

export async function connectRealtime(opts: ConnectOptions): Promise<RealtimeHandle> {
  // 1. Microphone. The user's tap that called us is the required gesture.
  const mic = await navigator.mediaDevices.getUserMedia({ audio: true })

  // 2. Peer connection; remote audio plays through the given <audio> element.
  const pc = new RTCPeerConnection()
  pc.ontrack = (e) => {
    const [stream] = e.streams
    opts.audioEl.srcObject = stream
  }
  for (const track of mic.getTracks())
    pc.addTrack(track, mic)

  // 3. Data channel carries session config out and response events in.
  const dc = pc.createDataChannel('oai-events')
  dc.onmessage = (e) => {
    try {
      opts.onEvent(JSON.parse(e.data))
    }
    catch {
      // Ignore non-JSON frames.
    }
  }
  dc.onopen = () => {
    dc.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: opts.instructions,
        audio: { input: { turn_detection: { type: 'server_vad' } } },
      },
    }))
    opts.onOpen()
  }

  // 4. SDP offer → OpenAI → answer.
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const res = await fetch(`${CALLS_URL}?model=${encodeURIComponent(opts.model)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.token}`,
      'Content-Type': 'application/sdp',
    },
    body: offer.sdp,
  })

  if (!res.ok)
    throw new Error(`Realtime connect failed (${res.status})`)

  const answer = await res.text()
  await pc.setRemoteDescription({ type: 'answer', sdp: answer })

  // 5. Teardown: close the channel, stop the mic, drop the connection.
  return {
    stop: () => {
      try {
        dc.close()
      }
      catch {
        // Channel may already be closed.
      }
      for (const track of mic.getTracks())
        track.stop()
      try {
        pc.close()
      }
      catch {
        // Connection may already be closed.
      }
      opts.audioEl.srcObject = null
    },
  }
}
