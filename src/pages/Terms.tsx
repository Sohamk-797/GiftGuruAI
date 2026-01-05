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

const Terms = () => {
  useEffect(() => {
    console.log("Visited Terms of Service page");
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
                Terms of Service
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Last updated: {lastUpdated}
              </CardDescription>
            </CardHeader>

            <CardContent className="prose prose-invert max-w-none p-8 md:p-10">
              <section>
                <h2>Introduction</h2>
                <p>
                  These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
                  Gift Guru AI service (the &ldquo;Service&rdquo;). Please read them carefully.
                  By using the Service you agree to these Terms. If you do not agree, do not use
                  the Service.
                </p>
              </section>

              <section>
                <h2>1. Who May Use the Service</h2>
                <p>
                  You must be at least 13 years old to use Gift Guru AI. By accessing or using the
                  Service you represent that you are at least 13 and that you have the legal
                  capacity to enter into and abide by these Terms.
                </p>
              </section>

              <section>
                <h2>2. Account & Authentication</h2>
                <p>
                  The Service supports authentication via third-party providers (for example,
                  Google OAuth) and/or email-based accounts. You are responsible for maintaining
                  the confidentiality of your account credentials and for all activity that occurs
                  under your account. Notify us immediately if you suspect unauthorized use of your
                  account.
                </p>
              </section>

              <section>
                <h2>3. User Content & Inputs</h2>
                <p>
                  The Service generates gift suggestions based on information you provide (name,
                  age, relationship, hobbies, personality traits, budget, city, etc.). You are
                  responsible for the content you submit. Do not submit sensitive personal data
                  (e.g., government ID numbers, financial account data, health records).
                </p>
                <p>
                  By submitting content you grant Gift Guru AI a non-exclusive, worldwide,
                  royalty-free license to use, store, and display that content for providing and
                  improving the Service (including storage in third-party systems such as Supabase).
                </p>
              </section>

              <section>
                <h2>4. Recommendations & Accuracy</h2>
                <p>
                  Gift suggestions are generated algorithmically and may sometimes be inaccurate,
                  incomplete, or not suitable. Recommendations are provided for informational and
                  convenience purposes only. You should use your judgment when acting on suggestions
                  (e.g., purchasing items, sharing personal details).
                </p>
              </section>

              <section>
                <h2>5. Payments & Third-Party Services</h2>
                <p>
                  If the Service offers paid features, those purchases will be subject to any
                  applicable third-party payment provider terms. We are not responsible for the
                  policies or practices of external vendors. Payment processing may occur via
                  third-party providers and their terms apply.
                </p>
              </section>

              <section>
                <h2>6. Intellectual Property</h2>
                <p>
                  All rights, title, and interest in and to the Service, including the software,
                  design, code, and content provided by Gift Guru AI (excluding your user content),
                  are owned by Gift Guru AI or its licensors. You may not copy, modify, distribute,
                  sell, or lease any part of the Service without our prior written consent.
                </p>
                <p>
                  You retain ownership of the content you submit, subject to the license you grant
                  in Section 3.
                </p>
              </section>

              <section>
                <h2>7. Links, Images & External Content</h2>
                <p>
                  The Service may retrieve images and data from third-party APIs (for example,
                  Unsplash or retailer APIs) to display inspiration and product images. We are not
                  responsible for the accuracy, availability, or policies of those third parties.
                </p>
              </section>

              <section>
                <h2>8. Privacy</h2>
                <p>
                  Our Privacy Policy explains how we collect and use personal information. By using
                  the Service you consent to that collection and use. See the Privacy Policy for
                  details on data collection, retention, and your rights.
                </p>
              </section>

              <section>
                <h2>9. Prohibited Conduct</h2>
                <p>
                  When using the Service you must not:
                </p>
                <ul>
                  <li>Violate applicable laws or regulations.</li>
                  <li>Submit content that infringes others&rsquo; rights or is defamatory, abusive, or obscene.</li>
                  <li>Attempt to compromise the security or integrity of the Service.</li>
                  <li>Use the Service to send unsolicited messages or spam.</li>
                </ul>
                <p>
                  We may suspend or terminate accounts that violate these rules.
                </p>
              </section>

              <section>
                <h2>10. Termination</h2>
                <p>
                  We may suspend or terminate your access to the Service at any time, with or
                  without cause, including if you breach these Terms. On termination we may delete
                  or anonymize associated data in accordance with our data retention policies.
                </p>
              </section>

              <section>
                <h2>11. Disclaimers</h2>
                <p>
                  The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
                  warranties of any kind, either express or implied. To the fullest extent
                  permitted by law, Gift Guru AI disclaims all warranties, including merchantability,
                  fitness for a particular purpose, and non-infringement.
                </p>
              </section>

              <section>
                <h2>12. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by law, in no event shall Gift Guru AI, its
                  affiliates, licensors, or service providers be liable for indirect, incidental,
                  special, consequential, or punitive damages, or lost profits, arising out of or
                  related to your use of the Service. Our aggregate liability for direct damages is
                  limited to the greater of (a) the amount you paid to us in the prior 12 months,
                  or (b) $100.
                </p>
              </section>

              <section>
                <h2>13. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless Gift Guru AI and its affiliates, officers,
                  agents, and employees from any claim, demand, loss, or damages (including reasonable
                  attorneys' fees) arising out of your breach of these Terms, your misuse of the
                  Service, or your violation of applicable law.
                </p>
              </section>

              <section>
                <h2>14. Governing Law & Dispute Resolution</h2>
                <p>
                  These Terms are governed by the laws of the jurisdiction where Gift Guru AI is
                  operated (unless otherwise required by applicable law). Any dispute arising out of
                  or relating to these Terms will be resolved in the competent courts of that
                  jurisdiction, except where local law requires otherwise.
                </p>
              </section>

              <section>
                <h2>15. Changes to Terms</h2>
                <p>
                  We may modify these Terms from time to time. If changes are material, we will
                  provide notice (for example, via an in-app notice or email). Continued use after
                  a posted change constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section>
                <h2>16. Miscellaneous</h2>
                <ul>
                  <li>
                    <strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy
                    and any other legal notices published by us, constitute the entire agreement
                    between you and Gift Guru AI regarding the Service.
                  </li>
                  <li>
                    <strong>Severability:</strong> If any provision of these Terms is found to be
                    invalid or unenforceable, the remaining provisions will remain in effect.
                  </li>
                  <li>
                    <strong>Waiver:</strong> Our failure to enforce a right is not a waiver of that right.
                  </li>
                </ul>
              </section>

              <div className="mt-8 flex justify-center gap-4">
                <a href="/" className="no-underline">
                  <Button variant="outline">Return to Home</Button>
                </a>
                <a href="/privacy" className="no-underline">
                  <Button>View Privacy Policy</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;
