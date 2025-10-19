// Force static rendering - no dynamic data, no auth required
export const dynamic = 'error';
export const revalidate = false;

export default function PrivacyPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pawkit Privacy Policy</title>
      </head>
      <body style={{
        maxWidth: '760px',
        margin: '40px auto',
        padding: '0 20px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        lineHeight: '1.6',
        color: '#111'
      }}>
        <h1>Pawkit Privacy Policy</h1>
        <p><strong>Last updated:</strong> October 19, 2025</p>

        <h2>Overview</h2>
        <p>Pawkit and the Pawkit Web Clipper Chrome Extension help you save and organize web content. We are a privacy-first, local-first tool. We do not sell or share your personal data.</p>

        <h2>Data Collected by the Chrome Extension</h2>
        <p>When you choose to save a page, the extension accesses the active tab&apos;s <strong>URL</strong>, <strong>page title</strong>, and available <strong>metadata/thumbnail</strong> solely to create a bookmark card. The extension does not collect sensitive personal information, does not track your browsing, and does not run on pages unless you invoke it.</p>

        <h2>Storage and Sync</h2>
        <p>Saved data is stored on your device by default. If you enable Pawkit&apos;s optional cloud sync, data is transmitted securely to your Pawkit account to sync across your devices.</p>

        <h2>Third Parties</h2>
        <p>We do not sell, rent, or share user data with third parties. Limited service providers may process data strictly to provide Pawkit (e.g., hosting), under contractual confidentiality and security obligations.</p>

        <h2>Your Choices</h2>
        <p>You can delete items in the app at any time or uninstall the extension to remove locally stored data. For account deletion or data requests, contact us below.</p>

        <h2>Contact</h2>
        <p>Email: <a href="mailto:privacy@getpawkit.com" style={{color: '#2563eb'}}>privacy@getpawkit.com</a></p>

        <h2>Changes to This Policy</h2>
        <p>We may update this policy from time to time. We will post any changes on this page and update the &quot;Last updated&quot; date above.</p>
      </body>
    </html>
  );
}
