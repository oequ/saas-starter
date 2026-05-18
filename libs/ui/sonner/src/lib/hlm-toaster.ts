import type { BooleanInput, NumberInput } from '@angular/cdk/coercion';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	booleanAttribute,
	computed,
	inject,
	input,
	numberAttribute,
	ElementRef,
	PLATFORM_ID,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideInfo, lucideLoader2, lucideOctagonX, lucideTriangleAlert } from '@ng-icons/lucide';
import { BrnSonnerImports, type ToasterProps } from '@spartan-ng/brain/sonner';
import { hlm } from '@spartan-ng/helm/utils';
import type { ClassValue } from 'clsx';

/** Passed to Sonner; overridden in sonner-theme.css for reliability. */
const TOAST_THEME_VARS: Record<string, string> = {
	'--normal-bg': 'var(--popover)',
	'--normal-text': 'var(--popover-foreground)',
	'--normal-border': 'var(--border)',
	'--border-radius': 'var(--radius)',
	'--success-bg': 'var(--popover)',
	'--success-text': 'var(--popover-foreground)',
	'--success-border': 'var(--toast-success)',
	'--error-bg': 'var(--popover)',
	'--error-text': 'var(--popover-foreground)',
	'--error-border': 'var(--toast-error)',
	'--info-bg': 'var(--popover)',
	'--info-text': 'var(--popover-foreground)',
	'--info-border': 'var(--border)',
	'--warning-bg': 'var(--popover)',
	'--warning-text': 'var(--popover-foreground)',
	'--warning-border': 'var(--border)',
};

@Component({
	selector: 'hlm-toaster',
	imports: [BrnSonnerImports, NgIcon],
	providers: [provideIcons({ lucideCircleCheck, lucideInfo, lucideTriangleAlert, lucideOctagonX, lucideLoader2 })],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			position: fixed;
			z-index: 10001;
			inset: 0;
			width: 0;
			height: 0;
			overflow: visible;
			pointer-events: none;
		}
	`,
	template: `
		<brn-sonner-toaster
			[class]="_computedClass()"
			[invert]="invert()"
			[theme]="theme()"
			[position]="position()"
			[hotKey]="hotKey()"
			[richColors]="richColors()"
			[expand]="expand()"
			[duration]="duration()"
			[visibleToasts]="visibleToasts()"
			[closeButton]="closeButton()"
			[toastOptions]="toastOptions()"
			[offset]="offset()"
			[style]="_mergedStyle()"
		>
			<ng-template #loadingIcon>
				<ng-icon name="lucideLoader2" class="overflow-visible! text-base [&>svg]:motion-safe:animate-spin" />
			</ng-template>
			<ng-template #successIcon>
				<ng-icon name="lucideCircleCheck" class="overflow-visible! text-base" />
			</ng-template>
			<ng-template #errorIcon>
				<ng-icon name="lucideOctagonX" class="overflow-visible! text-base" />
			</ng-template>
			<ng-template #infoIcon>
				<ng-icon name="lucideInfo" class="overflow-visible! text-base" />
			</ng-template>
			<ng-template #warningIcon>
				<ng-icon name="lucideTriangleAlert" class="overflow-visible! text-base" />
			</ng-template>
		</brn-sonner-toaster>
	`,
})
export class HlmToaster {
	public readonly invert = input<ToasterProps['invert'], BooleanInput>(false, {
		transform: booleanAttribute,
	});
	/** Sonner palette is overridden via sonner-theme.css; value only affects minor internals. */
	public readonly theme = input<ToasterProps['theme']>('light');
	public readonly position = input<ToasterProps['position']>('bottom-right');
	public readonly hotKey = input<ToasterProps['hotkey']>(['altKey', 'KeyT']);
	public readonly richColors = input<ToasterProps['richColors'], BooleanInput>(true, {
		transform: booleanAttribute,
	});
	public readonly expand = input<ToasterProps['expand'], BooleanInput>(false, {
		transform: booleanAttribute,
	});
	public readonly duration = input<ToasterProps['duration'], NumberInput>(4000, {
		transform: numberAttribute,
	});
	public readonly visibleToasts = input<ToasterProps['visibleToasts'], NumberInput>(3, {
		transform: numberAttribute,
	});
	public readonly closeButton = input<ToasterProps['closeButton'], BooleanInput>(false, {
		transform: booleanAttribute,
	});
	public readonly toastOptions = input<ToasterProps['toastOptions']>({});
	public readonly offset = input<ToasterProps['offset']>(null);
	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	public readonly userStyle = input<Record<string, string>>({}, { alias: 'style' });

	protected readonly _computedClass = computed(() => hlm('toaster group', this.userClass()));

	protected readonly _mergedStyle = computed(() => ({
		...TOAST_THEME_VARS,
		...this.userStyle(),
	}));

	private readonly _host = inject(ElementRef<HTMLElement>);
	private readonly _document = inject(DOCUMENT);
	private readonly _platformId = inject(PLATFORM_ID);

	constructor() {
		const destroyRef = inject(DestroyRef);

		if (isPlatformBrowser(this._platformId)) {
			afterNextRender(() => {
				const host = this._host.nativeElement;
				if (host.parentElement !== this._document.body) {
					this._document.body.appendChild(host);
				}
			});
		}

		destroyRef.onDestroy(() => {
			this._host.nativeElement.remove();
		});
	}
}
