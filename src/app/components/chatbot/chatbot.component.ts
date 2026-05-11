import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Role } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ProductService } from '../../services/product.service';
import { DeliveryService } from '../../services/delivery.service';
import { NotificationService } from '../../services/notification.service';

interface ChatMessage {
  from: 'user' | 'bot';
  text?: string;
  html?: string;
  time: string;
  loading?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    /* ── Floating toggle button ── */
    .cb-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: #2563eb; color: #fff; border: none;
      cursor: pointer; box-shadow: 0 4px 16px rgba(37,99,235,.45);
      display: flex; align-items: center; justify-content: center;
      transition: background .2s, transform .15s;
    }
    .cb-fab:hover { background: #1d4ed8; transform: scale(1.07); }
    .cb-fab svg { width: 26px; height: 26px; }
    .cb-fab-badge {
      position: absolute; top: 4px; right: 4px;
      background: #ef4444; color: #fff; border-radius: 50%;
      width: 18px; height: 18px; font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }

    /* ── Chat panel ── */
    .cb-panel {
      position: fixed; bottom: 96px; right: 28px; z-index: 9998;
      width: 360px; max-height: 560px;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,.18);
      display: flex; flex-direction: column; overflow: hidden;
      animation: cbSlideUp .2s ease;
    }
    @keyframes cbSlideUp {
      from { opacity:0; transform: translateY(16px); }
      to   { opacity:1; transform: translateY(0); }
    }

    /* Header */
    .cb-header {
      background: linear-gradient(135deg,#2563eb,#1e40af);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      color: #fff; flex-shrink: 0;
    }
    .cb-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .cb-avatar svg { width: 20px; height: 20px; }
    .cb-header-info { flex:1; }
    .cb-header-name { font-weight: 700; font-size: 0.92rem; }
    .cb-header-status { font-size: 0.72rem; opacity: .8; display: flex; align-items: center; gap: 4px; }
    .cb-online-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; }
    .cb-close-btn {
      background: rgba(255,255,255,.15); border: none; color: #fff;
      border-radius: 8px; width: 30px; height: 30px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: background .15s;
    }
    .cb-close-btn:hover { background: rgba(255,255,255,.3); }
    .cb-close-btn svg { width: 16px; height: 16px; }

    /* Quick suggestions */
    .cb-suggestions {
      padding: 8px 12px; background: #f8faff;
      border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .cb-chip {
      background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
      border-radius: 20px; padding: 3px 10px; font-size: 0.72rem;
      cursor: pointer; white-space: nowrap; transition: background .15s;
    }
    .cb-chip:hover { background: #dbeafe; }

    /* Messages */
    .cb-messages {
      flex: 1; overflow-y: auto; padding: 14px 12px;
      display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    .cb-messages::-webkit-scrollbar { width: 4px; }
    .cb-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

    .cb-msg { display: flex; gap: 8px; max-width: 100%; }
    .cb-msg.user { flex-direction: row-reverse; }

    .cb-msg-avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 700; align-self: flex-end;
    }
    .cb-msg-avatar.bot-av { background: #eff6ff; color: #2563eb; }
    .cb-msg-avatar.user-av { background: #2563eb; color: #fff; }

    .cb-bubble {
      max-width: 82%; padding: 9px 12px; border-radius: 14px;
      font-size: 0.82rem; line-height: 1.5; word-break: break-word;
    }
    .cb-msg.bot  .cb-bubble { background: #f3f4f6; color: #111827; border-bottom-left-radius: 4px; }
    .cb-msg.user .cb-bubble { background: #2563eb; color: #fff; border-bottom-right-radius: 4px; }

    .cb-bubble ul { margin: 6px 0 0; padding-left: 1rem; }
    .cb-bubble li { margin-bottom: 3px; }
    .cb-bubble .cb-tag {
      display: inline-block; padding: 1px 7px; border-radius: 10px;
      font-size: 0.68rem; font-weight: 600; margin-left: 4px;
    }
    .cb-bubble .tag-pending  { background:#fef3c7; color:#92400e; }
    .cb-bubble .tag-approved { background:#d1fae5; color:#065f46; }
    .cb-bubble .tag-ordered  { background:#dbeafe; color:#1e40af; }
    .cb-bubble .tag-received { background:#d1fae5; color:#065f46; }
    .cb-bubble .tag-rejected { background:#fee2e2; color:#991b1b; }
    .cb-bubble .tag-shipped  { background:#dbeafe; color:#1e40af; }
    .cb-bubble .tag-delivered{ background:#d1fae5; color:#065f46; }
    .cb-bubble .tag-instock  { background:#d1fae5; color:#065f46; }
    .cb-bubble .tag-outstock { background:#fee2e2; color:#991b1b; }
    .cb-bubble .tag-lowstock { background:#fef3c7; color:#92400e; }

    .cb-bubble .cb-link {
      color: #2563eb; text-decoration: underline; cursor: pointer; background: none;
      border: none; font-size: inherit; padding: 0;
    }
    .cb-msg.user .cb-bubble .cb-link { color: #bfdbfe; }

    .cb-time { font-size: 0.65rem; color: #9ca3af; margin-top: 3px; text-align: right; }
    .cb-msg.bot .cb-time { text-align: left; }

    /* Typing dots */
    .cb-typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
    .cb-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #9ca3af;
      animation: cbBounce 1.2s infinite ease-in-out;
    }
    .cb-typing span:nth-child(2) { animation-delay: .2s; }
    .cb-typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes cbBounce {
      0%,80%,100% { transform: scale(.8); opacity:.5; }
      40%         { transform: scale(1.1); opacity:1; }
    }

    /* Input area */
    .cb-input-row {
      padding: 10px 12px; border-top: 1px solid #e5e7eb;
      display: flex; gap: 8px; align-items: center; flex-shrink: 0; background: #fff;
    }
    .cb-input {
      flex: 1; border: 1px solid #d1d5db; border-radius: 20px;
      padding: 8px 14px; font-size: 0.82rem; outline: none;
      transition: border-color .15s; font-family: inherit;
    }
    .cb-input:focus { border-color: #2563eb; }
    .cb-send-btn {
      width: 36px; height: 36px; border-radius: 50%;
      background: #2563eb; color: #fff; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background .15s;
    }
    .cb-send-btn:hover { background: #1d4ed8; }
    .cb-send-btn:disabled { background: #93c5fd; cursor: not-allowed; }
    .cb-send-btn svg { width: 16px; height: 16px; }
  `],
  template: `
    <!-- Toggle FAB -->
    <button class="cb-fab" (click)="togglePanel()" [title]="isOpen ? 'Close chat' : 'Open assistant'">
      @if (!isOpen) {
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        @if (unread > 0) { <span class="cb-fab-badge">{{ unread }}</span> }
      } @else {
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      }
    </button>

    <!-- Chat Panel -->
    @if (isOpen) {
      <div class="cb-panel">

        <!-- Header -->
        <div class="cb-header">
          <div class="cb-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
              <path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
            </svg>
          </div>
          <div class="cb-header-info">
            <div class="cb-header-name">ProcureSphere Assistant</div>
            <div class="cb-header-status">
              <span class="cb-online-dot"></span> Online · {{ roleLabel }}
            </div>
          </div>
          <button class="cb-close-btn" (click)="togglePanel()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <!-- Quick chips -->
        <div class="cb-suggestions">
          @for (chip of visibleChips; track chip) {
            <button class="cb-chip" (click)="sendChip(chip)">{{ chip }}</button>
          }
        </div>

        <!-- Messages -->
        <div class="cb-messages" #messagesEl>
          @for (msg of messages; track $index) {
            <div class="cb-msg" [class.user]="msg.from === 'user'" [class.bot]="msg.from === 'bot'">
              <div class="cb-msg-avatar" [class.bot-av]="msg.from === 'bot'" [class.user-av]="msg.from === 'user'">
                {{ msg.from === 'bot' ? '🤖' : userInitial }}
              </div>
              <div>
                <div class="cb-bubble">
                  @if (msg.loading) {
                    <div class="cb-typing">
                      <span></span><span></span><span></span>
                    </div>
                  } @else if (msg.html) {
                    <span [innerHTML]="msg.html"></span>
                  } @else {
                    {{ msg.text }}
                  }
                </div>
                @if (!msg.loading) {
                  <div class="cb-time">{{ msg.time }}</div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Input -->
        <div class="cb-input-row">
          <input #inputEl class="cb-input" [(ngModel)]="inputText"
            placeholder="Ask me anything…"
            (keydown.enter)="send()" />
          <button class="cb-send-btn" (click)="send()" [disabled]="isBusy">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="m22 2-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
    }
  `,
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  isOpen = false;
  inputText = '';
  isBusy = false;
  messages: ChatMessage[] = [];
  unread = 0;
  private shouldScroll = false;

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private productService: ProductService,
    private deliveryService: DeliveryService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.pushBot(`Hi ${this.firstName}! 👋 I'm your ProcureSphere assistant.<br>I can help you with orders, products, deliveries, notifications and more.<br>Type a question or tap a quick action below.`);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.messagesEl) {
      const el = this.messagesEl.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  get role(): Role { return (this.authService.getCurrentUser()?.role as Role) || 'USER'; }

  get roleLabel(): string {
    const map: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Manager', USER: 'User', SUPPLIER: 'Supplier' };
    return map[this.role] || 'User';
  }

  get firstName(): string { return this.authService.getCurrentUser()?.firstName || 'there'; }
  get userInitial(): string { return (this.authService.getCurrentUser()?.firstName?.[0] || 'U').toUpperCase(); }

  get visibleChips(): string[] {
    const base = ['My Orders', 'Deliveries', 'Notifications', 'Help'];
    if (this.role === 'ADMIN' || this.role === 'SUPPLIER') base.splice(1, 0, 'My Products');
    if (this.role === 'ADMIN' || this.role === 'MANAGER') base.splice(0, 0, 'Pending Orders');
    return base.slice(0, 5);
  }

  togglePanel() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unread = 0;
      setTimeout(() => this.inputEl?.nativeElement.focus(), 100);
    }
  }

  sendChip(chip: string) { this.inputText = chip; this.send(); }

  send() {
    const text = this.inputText.trim();
    if (!text || this.isBusy) return;
    this.inputText = '';
    this.pushUser(text);
    this.processMessage(text.toLowerCase());
  }

  private pushUser(text: string) {
    this.messages.push({ from: 'user', text, time: this.now() });
    this.shouldScroll = true;
  }

  private pushBot(html: string) {
    this.messages.push({ from: 'bot', html, time: this.now() });
    this.shouldScroll = true;
    if (!this.isOpen) this.unread++;
  }

  private addLoader(): number {
    this.messages.push({ from: 'bot', loading: true, time: this.now() });
    this.shouldScroll = true;
    return this.messages.length - 1;
  }

  private replaceLoader(idx: number, html: string) {
    this.messages[idx] = { from: 'bot', html, time: this.now() };
    this.shouldScroll = true;
    if (!this.isOpen) this.unread++;
  }

  private processMessage(q: string) {
    this.isBusy = true;

    // ── Greetings ──
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)\b/.test(q)) {
      this.pushBot(`Hello ${this.firstName}! 😊 How can I assist you today?<br>Try asking about your <b>orders</b>, <b>products</b>, or <b>deliveries</b>.`);
      this.isBusy = false; return;
    }

    // ── Help ──
    if (/help|what can you|commands|features/.test(q)) {
      this.pushBot(this.helpText()); this.isBusy = false; return;
    }

    // ── Navigate ──
    if (/go to|open|navigate|take me/.test(q)) {
      this.handleNavigation(q); this.isBusy = false; return;
    }

    // ── Pending / approval orders ──
    if (/pending/.test(q) && /order/.test(q)) {
      const idx = this.addLoader();
      this.orderService.getAll('PENDING').subscribe({
        next: (res) => {
          if (!res.success || res.data.length === 0) {
            this.replaceLoader(idx, '✅ No pending orders right now.'); this.isBusy = false; return;
          }
          const rows = res.data.slice(0, 6).map(o =>
            `<li><b>#ORD-${o.orderId}</b> — ${o.orderTitle} <span class="cb-tag tag-pending">PENDING</span></li>`
          ).join('');
          this.replaceLoader(idx, `📋 <b>${res.data.length} pending order(s):</b><ul>${rows}</ul>`);
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not fetch orders.'); this.isBusy = false; }
      });
      return;
    }

    // ── My / recent orders ──
    if (/\border(s)?\b/.test(q)) {
      const idx = this.addLoader();
      this.orderService.getAll().subscribe({
        next: (res) => {
          if (!res.success || res.data.length === 0) {
            this.replaceLoader(idx, 'You have no orders yet.'); this.isBusy = false; return;
          }
          const recent = res.data.slice(0, 5);
          const rows = recent.map(o => {
            const cls = o.status?.toLowerCase().replace('_', '') || 'pending';
            return `<li><b>#ORD-${o.orderId}</b> — ${o.orderTitle} <span class="cb-tag tag-${cls}">${o.status}</span></li>`;
          }).join('');
          this.replaceLoader(idx, `📦 <b>Your last ${recent.length} order(s):</b><ul>${rows}</ul>`);
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not fetch orders.'); this.isBusy = false; }
      });
      return;
    }

    // ── Low stock ──
    if (/low.?stock|out.?of.?stock/.test(q)) {
      const idx = this.addLoader();
      this.productService.getAll(undefined, undefined, false).subscribe({
        next: (res) => {
          if (!res.success || res.data.length === 0) {
            this.replaceLoader(idx, '✅ All products are in stock!'); this.isBusy = false; return;
          }
          const items = res.data.filter(p => !p.inStock && !p.isInStock).slice(0, 6);
          if (items.length === 0) { this.replaceLoader(idx, '✅ No out-of-stock products found.'); this.isBusy = false; return; }
          const rows = items.map(p => `<li><b>${p.productName}</b> — Qty: ${p.stockQuantity ?? 0} <span class="cb-tag tag-outstock">OUT</span></li>`).join('');
          this.replaceLoader(idx, `⚠️ <b>${items.length} out-of-stock product(s):</b><ul>${rows}</ul>`);
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not fetch products.'); this.isBusy = false; }
      });
      return;
    }

    // ── Products / catalog ──
    if (/product|catalog|item|inventory/.test(q)) {
      const idx = this.addLoader();
      this.productService.getAll().subscribe({
        next: (res) => {
          if (!res.success || res.data.length === 0) {
            this.replaceLoader(idx, 'No products found in the catalog.'); this.isBusy = false; return;
          }
          const list = res.data.slice(0, 5);
          const rows = list.map(p => {
            const inStock = p.inStock || p.isInStock;
            const cls = inStock ? 'tag-instock' : 'tag-outstock';
            const label = inStock ? 'IN STOCK' : 'OUT';
            return `<li><b>${p.productName}</b> — ₹${(p.price ?? 0).toFixed(2)} <span class="cb-tag ${cls}">${label}</span></li>`;
          }).join('');
          this.replaceLoader(idx, `🛒 <b>${res.data.length} product(s) in catalog (showing 5):</b><ul>${rows}</ul>`);
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not fetch products.'); this.isBusy = false; }
      });
      return;
    }

    // ── Deliveries / tracking ──
    if (/deliver|track|shipment|ship/.test(q)) {
      const idx = this.addLoader();
      this.deliveryService.getAll().subscribe({
        next: (res) => {
          if (!res.success || res.data.length === 0) {
            this.replaceLoader(idx, 'No delivery records found.'); this.isBusy = false; return;
          }
          const list = res.data.slice(0, 5);
          const rows = list.map(d => {
            const cls = d.status === 'DELIVERED' ? 'tag-delivered' : 'tag-shipped';
            return `<li><b>${d.trackingNumber || 'TRK-' + d.deliveryId}</b> — Order #${d.orderId} <span class="cb-tag ${cls}">${d.status || 'PENDING'}</span></li>`;
          }).join('');
          this.replaceLoader(idx, `🚚 <b>${res.data.length} delivery record(s) (showing 5):</b><ul>${rows}</ul>`);
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not fetch deliveries.'); this.isBusy = false; }
      });
      return;
    }

    // ── Notifications ──
    if (/notif|alert|message|unread/.test(q)) {
      const userId = this.authService.getCurrentUserId();
      const idx = this.addLoader();
      const obs$ = userId
        ? this.notificationService.getByUserId(userId)
        : this.notificationService.getAll();
      obs$.subscribe({
        next: (res) => {
          if (!res.success || res.data.length === 0) {
            this.replaceLoader(idx, '🔔 You have no notifications.'); this.isBusy = false; return;
          }
          const unread = res.data.filter(n => !(n.read ?? n.isRead));
          const rows = res.data.slice(0, 5).map(n =>
            `<li>${n.read || n.isRead ? '✅' : '🔴'} ${n.message}</li>`
          ).join('');
          this.replaceLoader(idx, `🔔 <b>${res.data.length} notification(s), ${unread.length} unread:</b><ul>${rows}</ul>`);
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not fetch notifications.'); this.isBusy = false; }
      });
      return;
    }

    // ── Summary / dashboard ──
    if (/summary|dashboard|overview|stats/.test(q)) {
      const idx = this.addLoader();
      this.orderService.getAll().subscribe({
        next: (res) => {
          const orders = res.data || [];
          const pending  = orders.filter(o => o.status === 'PENDING').length;
          const approved = orders.filter(o => o.status === 'APPROVED').length;
          const received = orders.filter(o => o.status === 'RECEIVED').length;
          this.replaceLoader(idx,
            `📊 <b>Quick Summary:</b><ul>
              <li>Total orders: <b>${orders.length}</b></li>
              <li>Pending: <b>${pending}</b></li>
              <li>Approved: <b>${approved}</b></li>
              <li>Received: <b>${received}</b></li>
            </ul>`
          );
          this.isBusy = false;
        },
        error: () => { this.replaceLoader(idx, '⚠️ Could not load summary.'); this.isBusy = false; }
      });
      return;
    }

    // ── Role info ──
    if (/my role|who am i|my account/.test(q)) {
      this.pushBot(`👤 You are logged in as <b>${this.firstName}</b> with the role <b>${this.roleLabel}</b>.`);
      this.isBusy = false; return;
    }

    // ── Fallback ──
    this.pushBot(`🤔 I didn't quite get that. Try asking about:<br>
      <b>orders</b> · <b>products</b> · <b>deliveries</b> · <b>notifications</b> · <b>pending orders</b> · <b>low stock</b> · <b>summary</b><br>
      Or type <b>help</b> for a full list.`);
    this.isBusy = false;
  }

  private handleNavigation(q: string) {
    const routes: [RegExp, string, string][] = [
      [/dashboard/,       '/app',               'Dashboard'],
      [/product.catalog|catalog/, '/app/products', 'Product Catalog'],
      [/my.product/,      '/app/my-products',   'My Products'],
      [/create.order/,    '/app/create-order',  'Create Order'],
      [/order.histor|orders/, '/app/orders',    'Order History'],
      [/deliver/,         '/app/delivery',      'Delivery Tracking'],
      [/notif/,           '/app/notifications', 'Notifications'],
      [/profile/,         '/app/profile',       'My Profile'],
      [/setting/,         '/app/settings',      'Settings'],
      [/inventor/,        '/app/inventory',      'Inventory'],
      [/user.manag/,      '/app/users',         'User Management'],
    ];
    for (const [pattern, path, label] of routes) {
      if (pattern.test(q)) {
        this.router.navigate([path]);
        this.pushBot(`🔗 Navigating you to <b>${label}</b>...`);
        return;
      }
    }
    this.pushBot(`I'm not sure which page you mean. Try: <b>go to orders</b>, <b>open products</b>, <b>navigate to dashboard</b>.`);
  }

  private helpText(): string {
    const items: string[] = [
      '📦 <b>My Orders</b> — view your recent orders',
      '⏳ <b>Pending Orders</b> — orders awaiting approval',
      '🛒 <b>Products</b> — browse the product catalog',
      '⚠️ <b>Low Stock</b> — products out of stock',
      '🚚 <b>Deliveries</b> — check delivery status',
      '🔔 <b>Notifications</b> — view your alerts',
      '📊 <b>Summary</b> — quick dashboard overview',
      '🔗 <b>Go to [page]</b> — navigate anywhere',
    ];
    return `🤖 <b>Here's what I can do:</b><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  }

  private now(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
