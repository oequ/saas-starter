import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CreateWorkspaceDialogComponent } from '@oequ/features-org';
import { HlmToaster } from '@spartan-ng/helm/sonner';

@Component({
  imports: [RouterOutlet, CreateWorkspaceDialogComponent, HlmToaster],
  selector: 'app-root',
  template: `
    <router-outlet />
    <oequ-create-workspace-dialog />
    <hlm-toaster position="top-center" richColors />
  `,
})
export class App {}
