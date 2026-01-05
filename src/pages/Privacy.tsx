import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const Privacy = () => {
  useEffect(() => {
    console.log("Visited Privacy Policy page");
  }, []);

  const lastUpdated = "December 2025";

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <DarkModeToggle />

      <div className="container mx-auto px-4 py-12 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-2xl border-2 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-4xl md:text-5xl font-bold text-center">
                Privacy Policy
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Last updated: {lastUpdated}
              </CardDescription>
            </CardHeader>

            <CardContent className="prose prose-invert max-w-none p-8 md:p-10">
              <section>
                <h2>Introduction</h2>
                <p>
                  Welcome to <strong>Gift Guru AI</strong> (the "Service"). Your privacy matters to
                  us. This Privacy Policy explains what information we collect, how we use it, who we
                  share it with, and the choices you have.
                </p>
              </section>

              <section>
                <h2>1. Information We Collect</h2>
                <p>We collect only the information necessary to provide and improve our service:</p>
                <ul>
                  <li>
                    <strong>Account information:</strong> If you sign-in with Google, we receive
                    basic profile information (name, email, profile picture) to authenticate and
                    personalize your experience.
                  </li>
                  <li>
                    <strong>Gift request details:</strong> Name, age, relation, occasion, hobbies,
                    personality traits, budget range, city — these are provided by you to generate
                    personalized suggestions.
                  </li>
                  <li>
                    <strong>Search history & results:</strong> With your permission we store recent
                    searches and the generated result set so you can revisit past recommendations.
                  </li>
                  <li>
                    <strong>Usage & diagnostics:</strong> Anonymous usage data and errors to help
                    improve the product.
                  </li>
                </ul>
              </section>

              <section>
                <h2>2. How We Use Your Information</h2>
                <ul>
                  <li>Generate personalized gift recommendations tailored to your inputs.</li>
                  <li>Authenticate users and manage sessions securely.</li>
                  <li>Improve the Service, analyze trends, and fix issues.</li>
                  <li>Send transactional messages related to your account (if any).</li>
                </ul>
              </section>

              <section>
                <h2>3. Data Sharing & Third Parties</h2>
                <p>We do not sell your personal information. We may share data with service providers:</p>
                <ul>
                  <li>
                    <strong>Supabase</strong> — for authentication and persistent storage of
                    search-history and user data.
                  </li>
                  <li>
                    <strong>Google OAuth</strong> — to authenticate users who sign-in with Google.
                  </li>
                  <li>
                    <strong>Unsplash (or image providers)</strong> — to fetch images used in
                    recommendations. We request images from third-party APIs but do not share your
                    personal data with them beyond what is necessary for the request.
                  </li>
                </ul>
                <p>
                  Each provider is selected for reliability and security. We require vendors to
                  follow industry-standard security practices.
                </p>
              </section>

              <section>
                <h2>4. Cookies & Local Storage</h2>
                <p>
                  We use cookies and browser storage only for essential functionality:
                </p>
                <ul>
                  <li>Session management (keeps you signed in).</li>
                  <li>Temporary caching of recent suggestions to improve responsiveness.</li>
                </ul>
                <p>
                  We do not use tracking cookies for advertising or cross-site user profiling.
                </p>
              </section>

              <section>
                <h2>5. Data Retention</h2>
                <p>
                  We retain account and search-history data for as long as you keep your account or
                  until you request deletion. Usage logs and anonymized analytics may be retained
                  longer for product improvement, but they won't contain direct identifiers.
                </p>
              </section>

              <section>
                <h2>6. Your Rights</h2>
                <p>
                  Depending on your jurisdiction, you may have rights such as:
                </p>
                <ul>
                  <li>Access the personal data we hold about you.</li>
                  <li>Request correction or deletion of your personal data.</li>
                  <li>Export your personal data in a machine-readable format.</li>
                </ul>
                <p>
                  To exercise any of these rights, contact us at the address below. We will respond
                  to validated requests within a reasonable timeframe.
                </p>
              </section>

              <section>
                <h2>7. Security</h2>
                <p>
                  We use industry-standard measures to protect data in transit and at rest, including
                  HTTPS/TLS and Supabase managed security features. While we strive to protect your
                  information, no system is 100% secure — if a breach occurs we will follow applicable
                  laws and notify affected users as required.
                </p>
              </section>

              <section>
                <h2>8. Children</h2>
                <p>
                  Gift Guru AI is not intended for use by children under 13. We do not knowingly
                  collect personal data from children. If you believe a child has provided us
                  personal data, contact us and we will delete it.
                </p>
              </section>

              <section>
                <h2>9. International Transfers</h2>
                <p>
                  Your data may be stored and processed in the countries where our service providers
                  operate. We take reasonable steps to ensure adequate protections are in place when
                  transferring data internationally.
                </p>
              </section>

              <section>
                <h2>10. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy to reflect changes in our practices or legal
                  requirements. If we make material changes, we'll post a notice here with an updated
                  "Last updated" date.
                </p>
              </section>
              
              <div className="mt-8 flex justify-center gap-4">
                <a href="/" className="no-underline">
                  <Button variant="outline">Return to Home</Button>
                </a>
                <a href="/terms" className="no-underline">
                  <Button>View Terms of Service</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
