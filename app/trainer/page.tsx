import { notFound } from "next/navigation";

/** 旧URLは存在しないように見せる */
export default function LegacyTrainerGone() {
  notFound();
}
