import { useEffect } from "react";

const Privacy = () => {
  useEffect(() => {
    console.log("Visited Privacy Policy page");
  }, []);

  return (
    <div className="min-h-screen bg-muted p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-background rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold mb-6 text-center">Privacy Policy</h1>

        <p className="text-muted-foreground mb-4">
          Last updated: December 2025
        </p>

        <p className="mb-4">
          Welcome to <strong>Gift Guru AI</strong>. Your privacy is extremely important to us.
          This Privacy Policy explains how we collect, use, and protect your
          information when you use our website and services.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">1. Information We Collect</h2>

        <p className="mb-4">
          We collect only the minimum information required to provide our gift 
          recommendation service:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Google Account Information</strong> (when you sign in via Google) — name, email, and profile picture.</li>
          <li><strong>Gift Preferences</strong> entered by you to receive better recommendations.</li>
          <li><strong>Usage data</strong> such as search activity and browsing interactions.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">2. How We Use Your Information</h2>

        <p className="mb-4">We use your data only for:</p>

        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Personalized gift suggestions</li>
          <li>Improving app performance and user experience</li>
          <li>Authentication and secure login</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">3. Data Sharing</h2>

        <p className="mb-4">
          We <strong>never sell</strong> your data.  
          We share data only with trusted services essential to operations:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Supabase</strong> — authentication & database</li>
          <li><strong>Google OAuth</strong> — login and identity verification</li>
          <li><strong>Unsplash</strong> — gift image fetching</li>
        </ul>

        <p className="mb-4">
          All integrations follow strict security and privacy standards.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">4. Cookies</h2>

        <p className="mb-4">
          Gift Guru AI uses cookies only for essential authentication and to
          maintain your logged-in session. We do not track users across websites.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">5. Your Rights</h2>

        <p className="mb-4">
          You can request deletion of your data at any time by contacting us.
          You also have the right to:
        </p>

        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Access your stored data</li>
          <li>Update or correct information</li>
          <li>Delete your account</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">6. Security</h2>

        <p className="mb-4">
          We use industry-standard encryption, secure authentication, and
          Supabase’s managed security features to protect your data.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">7. Contact Us</h2>

        <p className="mb-4">
          If you have any questions about this Privacy Policy, you can contact us at:
        </p>

        <p className="font-medium">
          📧 Email: <a href="mailto:sohamk797@gmail.com" className="text-primary underline">
            sohamk797@gmail.com
          </a>
        </p>

        <div className="mt-10 text-center">
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
