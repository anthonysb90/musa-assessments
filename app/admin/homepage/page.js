import { redirect } from "next/navigation";

// This screen was consolidated into the Assessments hub. Kept as a redirect so
// old bookmarks/links still land somewhere useful instead of a drifting copy.
export default function RedirectToHub() {
  redirect("/admin/assessments");
}
