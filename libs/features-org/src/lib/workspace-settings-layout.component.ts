import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'oequ-workspace-settings-layout',
  imports: [RouterOutlet],
  template: `
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Workspace settings</h1>
      <div class="mt-6">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSettingsLayoutComponent {}
