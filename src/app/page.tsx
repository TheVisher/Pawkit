import { redirect } from 'next/navigation';

/**
 * Root page - redirects to home
 *
 * Authentication is handled by Convex. The home page and dashboard
 * layout handle showing login if not authenticated.
 */
export default function Home() {
  redirect('/home');
}
