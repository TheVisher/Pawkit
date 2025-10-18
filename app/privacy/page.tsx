export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy for Pawkit Web Clipper</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 18, 2025</p>

        <div className="prose dark:prose-invert max-w-none">
          <h2>Overview</h2>
          <p>
            Pawkit Web Clipper (&quot;the Extension&quot;) is a browser extension that helps you save web pages,
            articles, and links to your Pawkit collections. This privacy policy explains how we handle your data.
          </p>

          <h2>Data Collection and Storage</h2>

          <h3>What Data We Collect</h3>
          <p>The Extension collects and stores the following data locally on your device:</p>
          <ul>
            <li>
              <strong>Bookmarks and Web Pages</strong>: URLs, titles, and descriptions of pages you choose to save
            </li>
            <li>
              <strong>Collections</strong>: Organization folders and categories you create
            </li>
            <li>
              <strong>User Preferences</strong>: Your settings such as auto metadata fetch, thumbnail visibility,
              and preview service URL
            </li>
            <li>
              <strong>Authentication Tokens</strong>: If you sync with the Pawkit web application, your authentication
              credentials are stored locally
            </li>
          </ul>

          <h3>How We Store Your Data</h3>
          <ul>
            <li>All data is stored <strong>locally</strong> in your browser using Chrome&apos;s storage API</li>
            <li>No data is transmitted to third-party servers except:
              <ul>
                <li>When you explicitly choose to sync with your Pawkit account (pawkit.vercel.app or getpawkit.com)</li>
                <li>When fetching metadata for saved pages (only the URLs you choose to save)</li>
              </ul>
            </li>
          </ul>

          <h2>Permissions</h2>
          <p>The Extension requires the following permissions:</p>
          <ul>
            <li><strong>storage</strong>: To save your bookmarks and preferences locally</li>
            <li><strong>tabs</strong>: To detect the current page when you save a bookmark</li>
            <li><strong>activeTab</strong>: To access the current page&apos;s URL and title when saving</li>
            <li><strong>contextMenus</strong>: To add &quot;Save to Pawkit&quot; to your right-click menu</li>
          </ul>

          <h2>Data Sharing</h2>
          <p>We do not:</p>
          <ul>
            <li>Sell your data to third parties</li>
            <li>Share your data with advertisers</li>
            <li>Track your browsing history</li>
            <li>Collect analytics or telemetry data</li>
          </ul>

          <h2>Data Security</h2>
          <ul>
            <li>All data remains on your device unless you explicitly sync with the Pawkit web application</li>
            <li>Communication with Pawkit servers (when syncing) uses HTTPS encryption</li>
            <li>You can delete all Extension data at any time by removing the extension or clearing your browser&apos;s extension data</li>
          </ul>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access all data stored by the Extension (via browser developer tools)</li>
            <li>Delete all data by uninstalling the Extension</li>
            <li>Export your data using the Extension&apos;s export feature</li>
            <li>Opt out of any optional features (metadata fetching, sync, etc.)</li>
          </ul>

          <h2>Children&apos;s Privacy</h2>
          <p>
            The Extension is not intended for users under the age of 13. We do not knowingly collect data from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Changes will be reflected in the &quot;Last Updated&quot;
            date above. Continued use of the Extension after changes constitutes acceptance of the updated policy.
          </p>

          <h2>Contact</h2>
          <p>If you have questions about this privacy policy or data handling practices, please:</p>
          <ul>
            <li>Open an issue on our GitHub repository</li>
            <li>Contact us via the Pawkit website</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>The Extension may interact with:</p>
          <ul>
            <li>
              <strong>Pawkit Web Application</strong> (pawkit.vercel.app, getpawkit.com): For syncing your bookmarks
              when you choose to enable this feature
            </li>
            <li>
              <strong>Metadata Preview Service</strong>: For fetching page previews and metadata when you save a
              bookmark (only if enabled)
            </li>
          </ul>
          <p>These services have their own privacy policies and data handling practices.</p>

          <h2>Open Source</h2>
          <p>
            Pawkit is open source software. You can review the source code to verify our data handling practices.
          </p>
        </div>
      </div>
    </div>
  );
}
