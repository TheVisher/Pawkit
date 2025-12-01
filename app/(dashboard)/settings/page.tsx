import { redirect } from "next/navigation";

// Settings page has been consolidated into the Profile Modal
// Redirect to home where users can access settings via their profile
export default function SettingsPage() {
  redirect("/home");
}
