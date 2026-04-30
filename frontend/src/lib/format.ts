import { u8aToHex } from "@polkadot/util";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { CHAIN_PRICE_DECIMALS, CHAIN_PRICE_SCALE } from "@/config";

export const VARA_SS58_PREFIX = 137;
const PLANCK_PER_VARA = 10n ** 12n;

type BigNumberish = string | number | bigint | null | undefined;

export function toBigIntValue(value: BigNumberish): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));

  const normalized = value.trim();
  if (!normalized) return 0n;
  return BigInt(normalized);
}

export function parseUnsignedInteger(input: string, label: string): bigint {
  const normalized = input.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return BigInt(normalized);
}

export function parsePlanck(input: string): bigint {
  const normalized = input.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Entry fee must be a positive VARA amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > 12) {
    throw new Error("VARA amounts support at most 12 decimal places.");
  }

  return (
    BigInt(whole) * PLANCK_PER_VARA +
    BigInt(fraction.padEnd(12, "0") || "0")
  );
}

export function formatPlanck(
  value: BigNumberish,
  fractionDigits = 2,
  suffix = " VARA",
): string {
  const raw = toBigIntValue(value);
  const negative = raw < 0n;
  const absolute = negative ? -raw : raw;
  const whole = absolute / PLANCK_PER_VARA;
  const fraction = absolute % PLANCK_PER_VARA;
  const paddedFraction = fraction.toString().padStart(12, "0");
  const trimmedFraction = paddedFraction.slice(0, fractionDigits).replace(/0+$/, "");

  return `${negative ? "-" : ""}${whole.toLocaleString()}${trimmedFraction ? `.${trimmedFraction}` : ""}${suffix}`;
}

export function formatSigned(value: BigNumberish, suffix = ""): string {
  const raw = toBigIntValue(value);
  const sign = raw > 0n ? "+" : "";
  return `${sign}${raw.toLocaleString()}${suffix}`;
}

export function formatPercentBps(value: BigNumberish): string {
  const raw = toBigIntValue(value);
  const negative = raw < 0n;
  const absolute = negative ? -raw : raw;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");

  return `${negative ? "-" : ""}${whole.toLocaleString()}.${fraction}%`;
}

export function formatUsd(
  value: number | bigint | string | null | undefined,
  decimals = 2,
): string {
  const normalized =
    typeof value === "bigint"
      ? Number(value) / 100
      : typeof value === "string"
        ? Number(value)
        : value ?? 0;

  if (!Number.isFinite(normalized)) return "$0.00";

  return `$${normalized.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatUsdPrice(
  value: number | bigint | string | null | undefined,
  fractionDigits = 2,
): string {
  return formatUsd(value, fractionDigits);
}

export function toContractPrice(value: number | null | undefined): bigint {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.round(value * Number(CHAIN_PRICE_SCALE)));
}

export function fromContractPrice(value: BigNumberish): number {
  const raw = toBigIntValue(value);
  return Number(raw) / Number(CHAIN_PRICE_SCALE);
}

export function toChainPriceValue(value: number | null | undefined): bigint {
  return toContractPrice(value);
}

export function fromChainPriceValue(value: BigNumberish): number {
  return fromContractPrice(value);
}

export function formatChainUsdPrice(value: BigNumberish, fractionDigits = CHAIN_PRICE_DECIMALS): string {
  return formatUsd(fromContractPrice(value), fractionDigits);
}

export function normalizeTimestampMs(value: BigNumberish): number {
  const raw = Number(toBigIntValue(value));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}

export function formatTimestamp(value: BigNumberish): string {
  const timestamp = normalizeTimestampMs(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function toDatetimeLocalValue(timestamp: number): string {
  const date = new Date(timestamp - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export function sameAddress(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return false;

  try {
    return u8aToHex(decodeAddress(left)) === u8aToHex(decodeAddress(right));
  } catch {
    return left === right;
  }
}

export function toVaraAddressLike(address: string): string {
  try {
    return encodeAddress(decodeAddress(address), VARA_SS58_PREFIX);
  } catch {
    return address;
  }
}

export function toActorId(address: string): Uint8Array {
  const decoded = decodeAddress(address);

  if (decoded.length !== 32) {
    throw new Error(`Expected ActorId with 32 bytes, found ${decoded.length} bytes.`);
  }

  return new Uint8Array(decoded);
}

export function shortAddress(address?: string | null): string {
  if (!address) return "—";

  const normalized = toVaraAddressLike(address);
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 8)}…${normalized.slice(-8)}`;
}

export function isProgramIdLike(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

export function describeCountdown(
  startTime: BigNumberish,
  endTime: BigNumberish,
  now = Date.now(),
): string {
  const start = normalizeTimestampMs(startTime);
  const end = normalizeTimestampMs(endTime);

  if (now < start) {
    return `Starts in ${formatDuration(start - now)}`;
  }

  if (now < end) {
    return `Ends in ${formatDuration(end - now)}`;
  }

  return `Ended ${formatDuration(now - end)} ago`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
