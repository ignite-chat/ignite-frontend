import { useEffect, useRef } from 'react';
import { RoomEvent, Track } from 'livekit-client';
import { useVoiceStore } from '@/store/voice.store';

const VoiceAudioRenderer = () => {
  const room = useVoiceStore((s) => s.room);
  const isDeafened = useVoiceStore((s) => s.isDeafened);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!room) return;

    const attachTrack = (track, publication, participant) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (isDeafened) return;

      const el = track.attach();
      el.dataset.participantIdentity = participant.identity;
      containerRef.current?.appendChild(el);
    };

    const detachTrack = (track, publication, participant) => {
      if (track.kind !== Track.Kind.Audio) return;
      track.detach().forEach((el) => el.remove());
    };

    // Attach existing tracks
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track && publication.isSubscribed) {
          attachTrack(publication.track, publication, participant);
        }
      });
    });

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.TrackUnsubscribed, detachTrack);

    return () => {
      room.off(RoomEvent.TrackSubscribed, attachTrack);
      room.off(RoomEvent.TrackUnsubscribed, detachTrack);

      // Clean up all audio elements
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [room, isDeafened]);

  return <div ref={containerRef} style={{ display: 'none' }} />;
};

export default VoiceAudioRenderer;
