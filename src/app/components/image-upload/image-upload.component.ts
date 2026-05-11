import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../services/file.service';

/**
 * Reusable image-upload widget. Lets the user either upload a file (which the
 * backend stores and returns a URL for) or paste an external URL directly.
 *
 * Two-way binds the resulting URL via [(value)] / valueChange.
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .iu-wrap { display:flex; flex-direction:column; gap:0.5rem; }
    .iu-preview {
      position:relative; width:100%; height:120px;
      background:#f3f4f6; border-radius:8px; overflow:hidden;
      border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center;
    }
    .iu-preview img { width:100%; height:100%; object-fit:contain; }
    .iu-empty { display:flex; flex-direction:column; align-items:center; gap:4px; color:#9ca3af; font-size:0.78rem; }
    .iu-empty svg { width:28px; height:28px; opacity:0.5; }
    .iu-uploading {
      position:absolute; inset:0; background:rgba(255,255,255,0.75);
      display:flex; align-items:center; justify-content:center; font-size:0.82rem; color:#374151;
    }
    .iu-controls { display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem; }
    .iu-upload-label {
      padding:0.35rem 0.75rem; font-size:0.82rem; background:#2563eb; color:#fff;
      border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;
      border:none; transition:background 0.15s;
    }
    .iu-upload-label:hover { background:#1d4ed8; }
    .iu-upload-label.disabled { opacity:0.5; cursor:not-allowed; }
    .iu-upload-label svg { width:14px; height:14px; }
    .iu-remove-btn {
      padding:0.35rem 0.75rem; font-size:0.82rem; background:#fff;
      border:1px solid #d1d5db; border-radius:6px; cursor:pointer; color:#374151;
    }
    .iu-remove-btn:hover { background:#f9fafb; }
    .iu-hint { font-size:0.75rem; color:#6b7280; margin:0; }
    .iu-error { font-size:0.75rem; color:#dc2626; margin:0; }
    .iu-url-row { font-size:0.75rem; }
    .iu-url-row summary { color:#6b7280; cursor:pointer; }
    .iu-url-input {
      margin-top:4px; width:100%; padding:0.3rem 0.6rem;
      border:1px solid #d1d5db; border-radius:6px; font-size:0.82rem;
      outline:none; box-sizing:border-box;
    }
    .iu-url-input:focus { border-color:#2563eb; }
  `],
  template: `
    <div class="iu-wrap">
      <!-- Preview -->
      <div class="iu-preview">
        @if (resolvedPreview) {
          <img [src]="resolvedPreview" alt="Preview" (error)="onImageError()" />
        } @else {
          <div class="iu-empty">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            No image yet
          </div>
        }
        @if (uploading) {
          <div class="iu-uploading">Uploading...</div>
        }
      </div>

      <!-- Controls -->
      <div class="iu-controls">
        <label class="iu-upload-label" [class.disabled]="uploading">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          {{ value ? 'Replace image' : 'Upload image' }}
          <input type="file" style="display:none"
                 accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                 (change)="onFilePicked($event)" [disabled]="uploading" />
        </label>
        @if (value) {
          <button type="button" class="iu-remove-btn" (click)="clear()">Remove</button>
        }
      </div>

      @if (errorMsg) {
        <p class="iu-error">{{ errorMsg }}</p>
      } @else {
        <p class="iu-hint">JPG, PNG, GIF, WebP or SVG · Max 5 MB</p>
      }

      <!-- Optional URL entry -->
      <details class="iu-url-row">
        <summary>Or paste an image URL instead</summary>
        <input type="text" class="iu-url-input" [ngModel]="value || ''" (ngModelChange)="setUrl($event)"
               placeholder="https://example.com/image.jpg" />
      </details>
    </div>
  `,
})
export class ImageUploadComponent {
  /** The current image URL (relative "/uploads/..." or absolute). */
  @Input() value: string | null | undefined = '';
  @Output() valueChange = new EventEmitter<string>();

  uploading = false;
  errorMsg = '';
  imageBroken = false;

  constructor(private fileService: FileService) {}

  /** Display URL — turns relative backend paths into absolute. */
  get resolvedPreview(): string | null {
    if (!this.value || this.imageBroken) return null;
    return this.fileService.toAbsoluteUrl(this.value);
  }

  onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorMsg = '';
    try {
      this.fileService.validate(file);
    } catch (e: any) {
      this.errorMsg = e.message || 'Invalid file.';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.fileService.uploadProductImage(file).subscribe({
      next: (url) => {
        this.uploading = false;
        this.value = url;
        this.imageBroken = false;
        this.valueChange.emit(url);
        input.value = '';
      },
      error: (err) => {
        this.uploading = false;
        this.errorMsg = err?.error?.message || err?.message || 'Upload failed.';
        input.value = '';
      }
    });
  }

  setUrl(url: string) {
    this.value = url;
    this.imageBroken = false;
    this.errorMsg = '';
    this.valueChange.emit(url);
  }

  clear() {
    this.value = '';
    this.imageBroken = false;
    this.valueChange.emit('');
  }

  onImageError() {
    this.imageBroken = true;
    this.errorMsg = 'Could not load image from this URL.';
  }
}
