/**
 * Minimal EA F1 24/25/26 UDP telemetry parser.
 * Shared by the standalone bridge and the Electron main process.
 * Only the packets the dashboard needs are decoded; anything else is ignored.
 */

const HEADER = 29;

export function parsePacket(buf) {
  if (buf.length < HEADER) return null;
  const packetId = buf.readUInt8(6);
  const playerIndex = buf.readUInt8(27);

  // Car telemetry — 60 bytes per car
  if (packetId === 6) {
    const off = HEADER + playerIndex * 60;
    if (buf.length < off + 60) return null;
    return {
      speed: buf.readUInt16LE(off),
      throttle: buf.readFloatLE(off + 2) * 100,
      steering: buf.readFloatLE(off + 6),
      brake: buf.readFloatLE(off + 10) * 100,
      gear: buf.readInt8(off + 15),
      rpm: buf.readUInt16LE(off + 16),
      drs: buf.readUInt8(off + 18) === 1,
      tyreSurfaceTemp: [
        buf.readUInt8(off + 25),
        buf.readUInt8(off + 26),
        buf.readUInt8(off + 27),
        buf.readUInt8(off + 28),
      ],
    };
  }

  // Lap data — 57 bytes per car
  if (packetId === 2) {
    const off = HEADER + playerIndex * 57;
    if (buf.length < off + 57) return null;
    const lapDistance = buf.readFloatLE(off + 12);
    const totalDistance = buf.readFloatLE(off + 16);
    return {
      lastLapMs: buf.readUInt32LE(off),
      currentLapMs: buf.readUInt32LE(off + 4),
      s1Ms: buf.readUInt16LE(off + 8) + buf.readUInt8(off + 10) * 60000,
      s2Ms: buf.readUInt16LE(off + 11) + buf.readUInt8(off + 13) * 60000,
      lapDistanceM: lapDistance,
      totalDistanceM: totalDistance,
      lap: buf.readUInt8(off + 41),
      position: buf.readUInt8(off + 40),
      currentLapInvalid: buf.readUInt8(off + 43) === 1,
      pitStatus: buf.readUInt8(off + 45),
    };
  }

  // Car status — 55 bytes per car (ERS, fuel, compound)
  if (packetId === 7) {
    const off = HEADER + playerIndex * 55;
    if (buf.length < off + 55) return null;
    return {
      fuelKg: buf.readFloatLE(off + 5),
      fuelRemainingLaps: buf.readFloatLE(off + 13),
      compoundId: buf.readUInt8(off + 23),
      tyreAgeLaps: buf.readUInt8(off + 26),
      ersStoreJ: buf.readFloatLE(off + 33),
      ersMode: buf.readUInt8(off + 37),
    };
  }

  // Car damage — 42 bytes per car
  if (packetId === 10) {
    const off = HEADER + playerIndex * 42;
    if (buf.length < off + 42) return null;
    return {
      damage: {
        frontWingLeft: buf.readUInt8(off + 20),
        frontWingRight: buf.readUInt8(off + 21),
        rearWing: buf.readUInt8(off + 22),
        floor: buf.readUInt8(off + 23),
        diffuser: buf.readUInt8(off + 24),
        sidepod: buf.readUInt8(off + 25),
      },
      tyreWear: [
        buf.readFloatLE(off),
        buf.readFloatLE(off + 4),
        buf.readFloatLE(off + 8),
        buf.readFloatLE(off + 12),
      ],
    };
  }

  // Session — track id, weather, temps
  if (packetId === 1) {
    if (buf.length < HEADER + 12) return null;
    return {
      session: {
        weatherId: buf.readUInt8(HEADER),
        trackTemp: buf.readInt8(HEADER + 1),
        airTemp: buf.readInt8(HEADER + 2),
        totalLaps: buf.readUInt8(HEADER + 3),
        trackId: buf.readInt8(HEADER + 6),
      },
    };
  }

  return null;
}
