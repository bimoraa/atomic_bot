/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useRouter }    from 'next/navigation'
import { GeistSans }    from 'geist/font/sans'

export default function TermsOfServicePage() {
  const router = useRouter()

  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-[#ededed] ${GeistSans.className}`} style={{ letterSpacing: '-0.01em' }}>
      <div className="max-w-2xl mx-auto px-6 py-12 sm:py-16">

        {/* - back link - \\ */}
        <button
          onClick={() => router.back()}
          className="text-base text-[#888] hover:text-[#ccc] transition-colors mb-10 flex items-center gap-1.5"
        >
          ← Back
        </button>

        {/* - page title - \\ */}
        <h1 className="text-[1.5rem] sm:text-[1.75rem] font-normal text-[#ffffff] mb-3 leading-tight" style={{ letterSpacing: '-0.01em' }}>
          Terms of Service
        </h1>
        <p className="text-sm text-[#666] mb-10">Last updated: April 12, 2026</p>

        <hr className="border-[#222] mb-10" />

        {/* - sections - \\ */}
        <div className="flex flex-col gap-9">

          {/* - 1 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Final Purchase Policy and Non-Transferable License Key
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              All purchases of Atomic Hub are final and strictly non-refundable. The license key provided is
              non-transferable and must not be shared, sold, or given to others. Exceptions may only be made
              in urgent situations, subject to review and approval by our Executive Directors.
            </p>
          </section>

          {/* - 2 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Staff Conduct and Liability
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              If any of our staff members engage in the sale of items or services that appear legitimate but
              are later discovered to be fraudulent, Atomic Hub is not responsible for such transactions.
              While the individual may hold a staff role within our server, their actions outside of the
              server are beyond our responsibility. This does not mean that we condone or normalize
              fraudulent behavior, and we encourage users to exercise caution in any transactions.
            </p>
          </section>

          {/* - 3 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Subscription Plans and Security
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              Atomic Hub provides Mystic Elite subscription plan offering unique features and varying levels
              of log chance protection. We guarantee that our products are built with reliable security
              measures to ensure a safe experience for all users.
            </p>
          </section>

          {/* - 4 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Prohibition of Sharing and Service Restrictions
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              Sharing your Atomic Hub license key or access credentials is now strictly prohibited for all
              plan tiers. However, providing paid services, such as joki (game account boosting), is still
              permitted but only for users with a Mystic Regular/Core plan (up to a maximum of 100 accounts)
              or a Mystic Elite plan. Violating these terms may result in the immediate suspension or
              termination of your license key. Additionally, the use of Atomic with a VPN is strictly
              prohibited.
            </p>
          </section>

          {/* - 5 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Account Responsibility
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              We do not assume responsibility for any account bans or punitive actions taken by Roblox or
              Car Driving Indonesia as a result of using Atomic. Your use of the script is at your own risk,
              and you accept full responsibility for any consequences that may arise from its usage. You
              must ensure that your actions comply with the Terms and Conditions of the platforms you
              interact with.
            </p>
          </section>

          {/* - 6 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Executor Compatibility
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              We cannot be held responsible if Atomic does not work with a specific executor. We provide the
              script itself and do not offer support for external executors. Any compatibility issues between
              Atomic and a particular executor are not within our control. Please understand that our service
              is solely for providing the script, and we do not operate an executor support server.
            </p>
          </section>

          {/* - 7 - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Understanding Our Policies
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              By accessing and using Atomic, you acknowledge and agree to understand the policies outlined
              in our Terms of Service and any additional guidelines provided by Atomic. It is your
              responsibility to familiarize yourself with these policies to ensure compliance with our rules
              and regulations. If you have any questions or concerns regarding our policies, please contact
              our staff for clarification.
            </p>
          </section>

          {/* - important notice - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">
              Changes to These Terms
            </h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              All changes related to the server, its content, and our products (including scripts) are under
              the sole discretion of Atomic Hub. This includes, but is not limited to, modifications
              affecting script access, updates, and any other related products or services. By purchasing
              or using our products, you agree to comply with any mandatory changes implemented.
            </p>
          </section>

          {/* - contact - \\ */}
          <section>
            <h2 className="text-[0.9rem] font-normal text-[#ffffff] mb-1.5">Contact</h2>
            <p className="text-[0.85rem] text-[#888] leading-relaxed">
              If you have any questions or concerns regarding our policies, please contact our staff through
              the official Atomic Hub Discord server for clarification.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
