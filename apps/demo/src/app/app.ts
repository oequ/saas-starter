import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CreateWorkspaceDialogComponent } from '@oequ/features-org';

@Component({
  imports: [RouterOutlet, CreateWorkspaceDialogComponent],
  selector: 'app-root',
  template: `
    <router-outlet />
    <oequ-create-workspace-dialog />
  `,
})
export class App {}
