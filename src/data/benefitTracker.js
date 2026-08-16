/**
 * Ball of Duty Benefit Tracker
 *
 * Kluboldali, manuálisan kezelhető adatok.
 *
 * Fontos:
 * - a VPG statisztikákat NEM itt tároljuk
 * - a szezonadatokat NEM itt duplikáljuk
 * - a Discord jelenlét/szavazás adatai később innen
 *   vagy Discord integrációból érkeznek
 *
 * seasonId -> a saját BOD szezon ID-ja
 * playerId  -> a players.js játékos ID-ja
 */

export const benefitTrackerData = {
  3: {
    /**
     * Aktuális szezon
     *
     * Itt csak azok az adatok szerepelnek,
     * amelyeket nem tudunk automatikusan VPG-ből
     * vagy a seasons.js-ből meghatározni.
     */
    players: {
      // Példa:
      //
      // "gergo": {
      //   attendance: {
      //     attended: 18,
      //     total: 20,
      //   },
      //
      //   voting: {
      //     participated: 19,
      //     total: 20,
      //   },
      //
      //   penaltyPoints: 0,
      //
      //   totwAppearances: 0,
      //   totwBonus: 0,
      // },
    },
  },
};

/**
 * Üres Benefit adat létrehozása.
 */
export function createEmptyBenefitPlayer() {
  return {
    attendance: {
      attended: 0,
      total: 0,
    },

    voting: {
      participated: 0,
      total: 0,
    },

    penaltyPoints: 0,

    totwAppearances: 0,
    totwBonus: 0,
  };
}
