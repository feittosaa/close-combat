/** Jeito de lutar de cada personagem do Arcade; o controlador usa só isto para variar o plano de jogo. */
export interface ArcadeStyle {
  /** Distância (centro a centro) em que o lutador prefere ficar. */
  range: { min: number; max: number };
  /** Atira de longe, recua quando o adversário chega perto e usa o ar para se reposicionar. */
  zoning?: boolean;
  /** Dá dash no ar para ajustar a distância. */
  airDash?: boolean;
  /** Chance extra de agarrar quando está colado no adversário. */
  grapple?: number;
  /** Atravessa projéteis com golpes invulneráveis a eles. */
  throughProjectiles?: boolean;
}

export const DEFAULT_STYLE: ArcadeStyle = { range: { min: 60, max: 140 } };
export const ARCADE_STYLES: Readonly<Record<string, ArcadeStyle>> = {
  bob: { range: { min: 70, max: 170 }, throughProjectiles: true },
  texas: { range: { min: 260, max: 440 }, zoning: true, airDash: true },
  sm0g: { range: { min: 0, max: 80 }, grapple: .22 },
};
