import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CreateWorkspaceDialogService {
  readonly open = signal(false);

  requestOpen(): void {
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }
}
