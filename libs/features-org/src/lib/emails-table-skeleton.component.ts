import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';

const SKELETON_ROW_COUNT = 8;

@Component({
  selector: 'oequ-emails-table-skeleton',
  imports: [HlmSkeletonImports, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      hlmTableContainer
      class="border-input rounded-[5px] border"
      aria-busy="true"
      aria-label="Loading emails"
    >
      <table hlmTable class="w-full text-left text-sm">
        <thead hlmTHead>
          <tr hlmTr class="text-muted-foreground border-b text-xs">
            <th hlmTh class="w-10 px-4 py-2.5"></th>
            <th hlmTh class="px-4 py-2.5">
              <hlm-skeleton class="h-3 w-8 rounded-md" />
            </th>
            <th hlmTh class="px-4 py-2.5">
              <hlm-skeleton class="h-3 w-12 rounded-md" />
            </th>
            <th hlmTh class="px-4 py-2.5">
              <hlm-skeleton class="h-3 w-14 rounded-md" />
            </th>
            <th hlmTh class="px-4 py-2.5">
              <hlm-skeleton class="h-3 w-10 rounded-md" />
            </th>
            <th hlmTh class="w-12 px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody hlmTBody class="divide-border divide-y">
          @for (_ of rowSlots; track $index) {
            <tr hlmTr>
              <td hlmTd class="px-4 py-3">
                <hlm-skeleton class="size-8 rounded-[5px]" />
              </td>
              <td hlmTd class="px-4 py-3">
                <hlm-skeleton class="h-4 w-40 max-w-full rounded-md" />
              </td>
              <td hlmTd class="px-4 py-3">
                <hlm-skeleton class="h-5 w-20 rounded-full" />
              </td>
              <td hlmTd class="px-4 py-3">
                <hlm-skeleton class="h-4 w-56 max-w-full rounded-md" />
              </td>
              <td hlmTd class="px-4 py-3">
                <hlm-skeleton class="h-4 w-24 rounded-md" />
              </td>
              <td hlmTd class="px-4 py-3">
                <hlm-skeleton class="ms-auto size-8 rounded-md" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class EmailsTableSkeletonComponent {
  protected readonly rowSlots = Array.from(
    { length: SKELETON_ROW_COUNT },
    (_, index) => index,
  );
}
