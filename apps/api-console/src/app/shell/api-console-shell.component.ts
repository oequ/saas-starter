import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserMenuComponent } from '@oequ/shell';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

import { API_CONSOLE_NAV_SECTIONS } from './api-console-nav.model';

@Component({
  selector: 'ac-api-console-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HlmSidebarImports,
    UserMenuComponent,
  ],
  templateUrl: './api-console-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiConsoleShellComponent {
  protected readonly sections = API_CONSOLE_NAV_SECTIONS;
}
