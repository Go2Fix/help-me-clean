# tawk.to Full Analysis for Go2Fix.ro

---

## 1. WHAT IS TAWK.TO?

A **100% free** live chat platform (35% market share). Includes: live chat, ticketing, CRM, knowledge base, chat pages, video/voice/screensharing — all free, unlimited agents, unlimited chats, unlimited history.

---

## 2. CORE FEATURES

### Live Chat
- Embed on go2fix.ro via single JS snippet (official React plugin: `@tawk.to/tawk-messenger-react`)
- Unlimited agents, concurrent chats, and history
- File/image sharing (up to 5 attachments/message)
- Pre-chat forms with department routing
- Offline messaging → converts to tickets
- 45+ languages (Romanian included)
- Video + Voice + Screensharing (free)

### JavaScript API (Deep Integration)
- **Widget control:** show/hide/maximize/minimize programmatically
- **User identification:** `login()` with HMAC-SHA256 secure mode — link chat to Go2Fix users
- **Custom attributes:** up to 50 key-value pairs per visitor (booking ID, user type, etc.)
- **Custom events:** track actions (`booking_created`, `payment_completed`)
- **Tags:** up to 10 per chat
- **Event callbacks:** `onChatStarted`, `onChatEnded`, `onChatMessageVisitor`, `onFileUpload`, etc.
- **Role-based visibility:** hide widget for admins, show for clients

### Webhooks (Backend Integration)
- 4 events only: `chat:start`, `chat:end`, `chat:transcript_created`, `ticket:create`
- HMAC-SHA1 signed payloads, 12-hour retry window, 30-second timeout
- Can pipe into Go backend for logging/analytics

### CRM / Contacts
- Unlimited contacts, 34+ filterable attributes, CSV import/export
- Full conversation history per customer across chats + emails
- Custom fields for tailored data

### Knowledge Base
- Hosted, SEO-optimized help center
- Multi-language support (RO + EN) — manual translation per article
- Custom domain possible (e.g., `help.go2fix.ro`) — requires white-label add-on
- Categories, search analytics, article feedback

### Chat Pages & Direct Links
- Standalone landing pages with embedded chat
- **Direct Agent Links** — each agent gets a unique URL (e.g., `tawk.to/cleanerMaria`)
- Customizable: photo, name, bio, services, social links, colors
- Clients can bookmark and return — conversation history preserved via cookies
- Offline form shown when agent is unavailable

### Ticketing
- Email forwarding converts emails to tickets
- Priority levels, tags, assignment, response templates

### AI Assist ($29/mo add-on)
- Apollo AI Bot for 24/7 automated responses, trains on your KB
- Smart Reply suggests responses to agents

---

## 3. PRICING

| Item | Cost |
|------|------|
| All core features (chat, CRM, KB, ticketing, video) | **FREE forever** |
| Remove "Powered by tawk.to" branding | $19.99 one-time |
| AI Assist (Apollo bot) | From $29/month |
| Hire professional chat agents | $1/hour |

---

## 4. MOBILE CAPABILITIES

### For Agents (Workers responding to chats)
- **iOS app** on App Store — answer chats, manage tickets, push notifications
- **Android app** on Google Play — same features

### For Customers (End users in your app)
- **NO native iOS SDK** (no SwiftUI/UIKit integration)
- **NO native Android SDK**
- **NO React Native SDK** (official)
- **Workaround:** Load Direct Chat Link in WKWebView — works but feels non-native
- Push notifications **NOT supported** in WebView approach

---

## 5. CHAT PAGES DEEP DIVE — Workers as "Business Cards"

### Can each worker have their own page?
**Yes.** Three approaches:
- **Profile Pages:** Each worker gets `tawk.to/worker-name` — photo, bio, services, social links
- **Properties:** Create one property per worker — fully isolated data, separate widget
- **Chat Pages:** Custom branded landing pages per property

### Conversation history for returning clients?
**Yes.** Uses cookies (`tawk_uuid`) to identify returning visitors. Previous conversations show automatically. 2-minute session buffer for continuity.

### Offline handling?
Worker offline → client sees offline form → message becomes ticket → worker gets email notification → responds via inbox.

### Custom domains?
**Yes** with white-label add-on. Can use `chat.go2fix.ro/worker-name`. Requires CNAME DNS setup.

### API creation of pages?
REST API available **by request only** (not self-service). Can create properties and invite agents programmatically after approval.

### Properties Model for Multi-Worker Setup
```
Go2Fix Account (Main)
├─ Property 1: Maria (Cleaning)
│  └─ Agents: Maria + Manager
│  └─ Chat page: tawk.to/maria-cleaning
│  └─ Data: Fully isolated
│
├─ Property 2: Ion (Plumbing)
│  └─ Agents: Ion + Manager
│  └─ Chat page: tawk.to/ion-plumbing
│  └─ Data: Fully isolated
│
└─ Property 3: Anna (Electrical)
   └─ Agents: Anna + Manager
   └─ Chat page: tawk.to/anna-electrical
   └─ Data: Fully isolated
```

---

## 6. TECHNICAL INTEGRATION WITH GO2FIX

### React (client-web)
```jsx
import TawkMessengerReact from '@tawk.to/tawk-messenger-react';
import { useRef, useEffect } from 'react';

function App() {
  const tawkRef = useRef();

  // Role-based visibility
  useEffect(() => {
    if (userRole === 'admin') {
      tawkRef.current?.hideWidget();
    } else {
      tawkRef.current?.showWidget();
    }
  }, [userRole]);

  return (
    <TawkMessengerReact
      propertyId="YOUR_PROPERTY_ID"
      widgetId="default"
      ref={tawkRef}
      tawkOnLoad={() => {
        // Pass authenticated user data
        window.Tawk_API.setAttributes({
          name: user.firstName + ' ' + user.lastName,
          email: user.email,
          go2fix_user_id: user.id,
          active_booking_id: currentBooking?.id,
          hash: secureHash // HMAC-SHA256 from backend
        });
      }}
    />
  );
}
```

### Go Backend (Webhook Handler)
```go
// HMAC-SHA1 verification
func VerifyTawkSignature(r *http.Request, secret string) bool {
    body, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("X-Tawk-Signature")
    h := hmac.New(sha1.New, []byte(secret))
    h.Write(body)
    expected := hex.EncodeToString(h.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expected))
}

// Secure mode hash generation for frontend
func GenerateTawkHash(email, apiKey string) string {
    h := hmac.New(sha256.New, []byte(apiKey))
    h.Write([]byte(email))
    return hex.EncodeToString(h.Sum(nil))
}
```

**Webhook events stored in PostgreSQL:**
```sql
CREATE TABLE tawk_chat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    chat_id VARCHAR(255),
    visitor_email VARCHAR(255),
    visitor_name VARCHAR(255),
    message_text TEXT,
    property_id VARCHAR(255),
    booking_id UUID REFERENCES bookings(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### iOS (WKWebView — No Native SDK)
```swift
struct TawkChatView: UIViewRepresentable {
    let user: User

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        let webView = WKWebView(frame: .zero, configuration: config)

        // Load Direct Chat Link
        let url = URL(string: "https://tawk.to/chat/PROPERTY_ID/default")!
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Inject user data after page loads
        let js = """
        window.Tawk_API.setAttributes({
            'name': '\(user.name)',
            'email': '\(user.email)',
            'hash': '\(generateHash(user.email))'
        });
        """
        uiView.evaluateJavaScript(js)
    }
}
```

**iOS Limitation:** No native push notifications. Must use Go2Fix's own notification system (FCM/APNs).

### Knowledge Base Setup
- Custom domain: `help.go2fix.ro` via CNAME + white-label add-on ($19.99)
- Multi-language: Add Romanian + English manually per article
- SEO-optimized, categories, search analytics

---

## 7. ALTERNATIVES COMPARISON

| Feature | tawk.to | Crisp | Tidio | Intercom | Zendesk |
|---------|---------|-------|-------|----------|---------|
| **Price** | FREE | Free (2 seats) / $95/mo | Free (50 chats) / $29/mo | $139+/seat/mo | $99+/agent/mo |
| **Native iOS SDK** | NO (WebView) | **YES** (Swift) | **YES** | **YES** (React Native) | **YES** |
| **Native Android SDK** | NO (WebView) | **YES** | **YES** | **YES** | **YES** |
| **React Plugin** | Yes (official) | Yes | Limited | Yes (React Native) | API only |
| **Webhooks** | 4 events | Full | Plus only ($749/mo) | Full | Full |
| **REST API** | By request | Comprehensive | Plus+ only | Comprehensive | Comprehensive |
| **CRM** | Built-in (free) | Built-in | Basic | Deep integrations | Limited |
| **Knowledge Base** | Free, multilingual | $95/mo+ | AI-focused | Included | Included |
| **Chat Routing** | Department-based | Advanced (API) | Basic | Good | Advanced |
| **Romanian** | Yes (45+ langs) | Yes (60+ langs) | Unknown | Limited | Possible |
| **Reliability** | 91% satisfaction | 91%, fast support | 95% | Enterprise-grade | Enterprise-grade |
| **Agents** | Unlimited FREE | Per-workspace | Per-seat | Per-seat ($$$) | Per-agent ($$$) |
| **P2P Worker Chat** | Indirect (links) | Possible via API | Difficult | Not designed for it | Not designed for it |
| **Video/Voice** | Free | $95/mo+ | Unknown | Yes | No |
| **White Label** | $19.99 one-time | $295/mo | Unknown | No | Enterprise |

### Crisp — Best Paid Alternative
- **Native iOS + Android SDKs** (Swift, React Native support)
- Comprehensive REST API + webhooks at $95/mo (Essentials)
- Romanian language support (60+ languages)
- Per-workspace pricing (not per-agent) — scales better
- Better reliability and customer support reputation
- Omnichannel: WhatsApp, Instagram, SMS, Messenger, Viber, Line

### Tidio — Budget Alternative
- Native mobile SDKs (15-30 min integration)
- Strong AI (Lyro bot)
- Cheaper starter tier ($29/mo)
- **BUT:** Webhooks only on Plus plan ($749/mo) — too expensive for MVP

### Intercom — Enterprise Option
- Enterprise-grade, excellent React Native SDK
- Deep CRM integrations (Salesforce, HubSpot)
- **BUT:** $139+/seat/mo, pay-per-AI-resolution adds up fast
- Not designed for marketplace P2P routing

### Zendesk — Enterprise Ticketing
- Strong ticketing and SLA management
- Native mobile SDKs
- **BUT:** $99+/agent/mo, complex pricing with hidden add-on costs
- Overkill for MVP, better for enterprise support

---

## 8. PROS & CONS

### PROS
1. **100% Free** — unlimited everything, perfect for MVP budget
2. **Zero development cost** — single JS snippet, no backend changes needed initially
3. **Rich JS API** — identify users, pass booking context, control widget programmatically
4. **All-in-one** — chat + CRM + KB + ticketing + video replaces multiple tools
5. **Official React plugin** — `@tawk.to/tawk-messenger-react`
6. **Chat Pages as worker "business cards"** — each worker gets a shareable chat link
7. **Image/file sharing** — clients send photos of cleaning needs (up to 5/message)
8. **Video/Voice/Screensharing** — free, built-in, no extra setup
9. **Multi-language** — Romanian + English out of the box
10. **No vendor lock-in** — free = easy to swap out later
11. **Replaces custom chat development** — saves weeks of WebSocket work
12. **Webhook integration** — pipe chat events into Go backend for analytics

### CONS
1. **No native mobile SDK** — WebView-only for iOS/Android (non-native feel, looks cheap)
2. **No push notifications** via WebView — must build own notification layer
3. **Unreliable mobile notifications** for agents — widely reported issue in reviews
4. **"Powered by tawk.to" branding** on free tier ($19.99 to remove)
5. **Only 4 webhook events** — no per-message webhooks, limited real-time automation
6. **No automated per-worker routing** — department-based only, not individual routing
7. **REST API gated** — must apply for access, not self-service
8. **Reliability concerns** — 2 incidents in last 90 days, ~6.5h median resolution
9. **All agents see all chats** — no per-agent privacy controls on history
10. **No file sharing in offline messages** — only during live chat
11. **Client↔Worker chat is indirect** — not true P2P like Go2Fix design needs
12. **Data on tawk.to servers** — no data ownership, can't query your own DB
13. **Limited design customization** — basic widget options compared to Crisp/Intercom
14. **KB translations are manual** — no auto-translate, each article needs separate RO + EN entry

---

## 9. RECOMMENDATION

### For Go2Fix MVP: **Hybrid Approach**

| Channel | Solution | Why |
|---------|----------|-----|
| Client → Go2Fix Support | **tawk.to** (free) | Zero cost, instant setup, CRM + KB included |
| Client ↔ Worker P2P | **Keep custom / build later** | Needs booking context, native mobile, data ownership |
| Knowledge Base / FAQ | **tawk.to KB** (free) | help.go2fix.ro, RO + EN, SEO-optimized |
| CRM / Contact tracking | **tawk.to CRM** (free) | Track all support interactions |

### Why NOT full replacement:
- Go2Fix's client↔worker chat is tied to **specific bookings** — tawk.to can't model "client discussing booking #123 with worker Maria" natively
- No native iOS SDK means the **mobile app experience suffers** (WebView feels cheap for a premium marketplace)
- Worker routing is **manual**, not automatic based on booking assignment
- **No push notifications** in mobile WebView = clients miss messages
- **Data ownership** — chat data lives on tawk.to, not in your PostgreSQL

### If budget allows later: Consider **Crisp ($95/mo)**
- Native iOS + Android SDKs for polished mobile experience
- Better API for building custom P2P routing
- Same CRM + KB benefits with better mobile integration
- Per-workspace pricing scales better than per-agent

### Quick Win Right Now (30 minutes of work):
1. Add tawk.to widget to go2fix.ro web — `npm install @tawk.to/tawk-messenger-react`
2. Set up Knowledge Base with common FAQs in RO + EN
3. Use Chat Pages to give each worker a shareable chat link
4. Cost: **$0** (or $19.99 to remove branding)

---

## 10. SOURCES

### tawk.to Official
- [Developer Portal](https://developer.tawk.to)
- [JavaScript API](https://developer.tawk.to/javascript-api/)
- [Webhooks](https://developer.tawk.to/webhooks/)
- [React Plugin (GitHub)](https://github.com/tawk/tawk-messenger-react)
- [Chat Pages](https://www.tawk.to/software/chat-pages/)
- [CRM / Contacts](https://www.tawk.to/software/crm/)
- [Knowledge Base](https://www.tawk.to/software/knowledge-base/)
- [Ticketing](https://www.tawk.to/software/ticketing/)
- [Pricing](https://www.tawk.to/pricing/)
- [AI Assist](https://www.tawk.to/introducing-ai-assist/)
- [Video+Voice+Screensharing](https://www.tawk.to/videovoicescreensharing/)
- [Mobile Apps](https://www.tawk.to/mobile-apps/)
- [iPhone App](https://www.tawk.to/features/iphone-app/)
- [Android App](https://www.tawk.to/features/android-app/)

### tawk.to Help Center
- [Direct Chat Link](https://help.tawk.to/article/direct-chat-link)
- [Mobile Widget Integration](https://help.tawk.to/article/how-to-add-the-tawkto-widget-to-your-mobile-application)
- [White Labeling](https://help.tawk.to/article/how-to-white-label-your-chat-page-direct-chat-link-and-popout-chat-widget)
- [Widget Appearance](https://help.tawk.to/article/changing-the-appearance-of-the-chat-widget)
- [REST API](https://help.tawk.to/article/rest-api)
- [Chat History](https://help.tawk.to/article/viewing-deleting-and-exporting-your-chat-history)
- [Offline Messages](https://help.tawk.to/article/responding-to-offline-messages-via-ticketing)
- [Departments](https://help.tawk.to/article/creating-and-managing-departments)
- [Properties](https://help.tawk.to/article/adding-additional-websites-to-the-dashboard)
- [Knowledge Base Setup](https://help.tawk.to/article/setting-up-your-knowledge-base)
- [KB Custom Domain](https://help.tawk.to/article/how-to-white-label-your-knowledge-base)
- [KB Languages](https://help.tawk.to/article/customizing-your-knowledge-base-additional-languages)
- [setAttributes with Hash](https://help.tawk.to/article/how-to-use-setattributes-with-a-hash-in-javascript-api)
- [Secure Mode Hash](https://help.tawk.to/article/how-to-generate-a-hash-for-javascript-api)
- [Pre-Chat Form](https://help.tawk.to/article/using-the-pre-chat-form)
- [Cookies](https://help.tawk.to/article/what-are-tawkto-cookies-and-what-do-they-do)
- [Sessions](https://help.tawk.to/article/understanding-visitor-monitoring-and-chat-sessions)
- [Statistics](https://help.tawk.to/article/understanding-the-statistics-in-your-dashboard)
- [Remove Branding](https://help.tawk.to/article/purchasing-the-remove-branding-and-white-label-add-on)
- [File Types](https://help.tawk.to/article/what-file-types-and-sizes-are-supported)

### Alternatives
- [Crisp Pricing](https://crisp.chat/en/pricing/)
- [Crisp iOS SDK](https://crisp.chat/en/sdk/ios/)
- [Crisp REST API](https://docs.crisp.chat/references/rest-api/v1/)
- [Crisp Webhooks](https://docs.crisp.chat/references/web-hooks/v1/)
- [Crisp Multilingual](https://crisp.chat/en/livechat/multilingual-livechat/)
- [Tidio Pricing](https://www.tidio.com/pricing/)
- [Tidio Mobile SDK](https://www.tidio.com/mobile-sdk/)
- [Tidio Webhooks](https://help.tidio.com/hc/en-us/articles/9862368596892-Use-Webhooks-in-Tidio-with-OpenAPI)
- [Intercom Pricing](https://www.intercom.com/pricing)
- [Intercom React Native SDK](https://github.com/intercom/intercom-react-native)
- [Intercom Webhooks](https://developers.intercom.com/docs/webhooks)
- [Zendesk Pricing](https://www.zendesk.com/pricing/)
- [Zendesk Chat SDK iOS](https://developer.zendesk.com/documentation/classic-web-widget-sdks/chat-sdk-v2/ios/introduction/)
- [LiveChat Pricing](https://www.livechat.com/pricing/)

### Reviews & Comparisons
- [Tidio: tawk.to Review 2026](https://www.tidio.com/blog/tawk-to-review/)
- [SelectHub: Crisp vs tawk.to](https://www.selecthub.com/live-chat-software/crisp-vs-tawk-to/)
- [Featurebase: Crisp vs Intercom](https://www.featurebase.app/blog/crisp-vs-intercom)
- [Zapier: Best Live Chat Apps 2026](https://zapier.com/blog/best-customer-support-chat-apps/)
- [tawk.to Status Page](https://status.tawk.to)
