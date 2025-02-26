import { Component, Inject, OnInit, Optional } from '@angular/core'
import { Router } from '@angular/router'
import { AppStateService, CONFIG_KEY, ConfigurationService, ThemeService } from '@onecx/angular-integration-interface'
import { Observable, combineLatest, concat, filter, from, map, mergeMap, of, withLatestFrom } from 'rxjs'
import {
  WORKSPACE_CONFIG_BFF_SERVICE_PROVIDER,
  WorkspaceConfigBffService,
} from '../../shell-interface/workspace-config-bff-service-provider'

@Component({
  selector: 'ocx-shell-footer',
  templateUrl: './portal-footer.component.html',
  styleUrls: ['./portal-footer.component.scss'],
})
export class PortalFooterComponent implements OnInit {
  logoUrl$: Observable<string | undefined>
  copyrightMsg$: Observable<string> | undefined
  versionInfo$: Observable<string | undefined>

  constructor(
    private configurationService: ConfigurationService,
    public router: Router,
    private appState: AppStateService,
    private themeService: ThemeService,
    @Optional()
    @Inject(WORKSPACE_CONFIG_BFF_SERVICE_PROVIDER)
    public workspaceConfigBffService: WorkspaceConfigBffService | undefined
  ) {
    this.versionInfo$ = this.appState.currentMfe$.pipe(
      withLatestFrom(this.appState.currentWorkspace$.asObservable()),
      map(([mfe, workspace]) => {
        const mfeInfoVersion = mfe?.version || ''
        const mfeName = mfe?.displayName
        const hostVersion$ = from(this.configurationService.getProperty(CONFIG_KEY.APP_VERSION)).pipe(
          map((config) => config || 'DEV-LOCAL')
        )
        const mfInfoText = mfeName ? `MF ${mfeName} v${mfeInfoVersion}` : ''
        return `Portal: ${workspace.workspaceName} v${hostVersion$} ${mfInfoText}`
      })
    )
    this.logoUrl$ = combineLatest([
      this.themeService.currentTheme$.asObservable(),
      this.appState.currentWorkspace$.asObservable(),
    ]).pipe(
      mergeMap(([theme, portalData]) => {
        if (!theme.logoUrl && !portalData.logoUrl) {
          return (this.workspaceConfigBffService?.getThemeLogoByName(theme.name ?? '') ?? of()).pipe(
            filter((blob) => !!blob),
            map((blob) => URL.createObjectURL(blob))
          )
        }
        return of(theme.logoUrl || portalData.logoUrl)
      })
    )
  }

  ngOnInit(): void {
    this.copyrightMsg$ = concat(
      of('All rights reserved.'),
      this.appState.currentWorkspace$.pipe(
        map((workspaceData) => {
          if (
            !(
              workspaceData.footerLabel === '' ||
              workspaceData.footerLabel === 'string' ||
              workspaceData.footerLabel === undefined
            )
          ) {
            return workspaceData.companyName || workspaceData.footerLabel || 'All rights reserved.'
          }
          return ''
        })
      )
    )
  }

  public onErrorHandleSrc(): void {
    this.logoUrl$ = of(undefined)
  }

  onLoad(logoUrl: string) {
    if (logoUrl.startsWith('blob: ')) {
      URL.revokeObjectURL(logoUrl)
    }
  }
}
