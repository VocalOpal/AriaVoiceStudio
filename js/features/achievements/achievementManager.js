// Aria Voice Studio - Achievement Manager

import { getAll, put, STORES } from '../../core/storage.js';
import { updateAchievementUI } from './achievementUI.js';
import { ACHIEVEMENT_DEFINITIONS } from './achievementDefinitions.js';

import { debugLog } from '../../utils/debug.js';

export async function checkAchievements(sessions, streakData, totalTime) {
    try {
        const unlockedAchievements = await getAll(STORES.ACHIEVEMENTS);
        const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

        for (const def of ACHIEVEMENT_DEFINITIONS) {
            if (!unlockedIds.has(def.id) && def.check(sessions, streakData, totalTime)) {
                // Unlock achievement
                await put(STORES.ACHIEVEMENTS, {
                    id: def.id,
                    label: def.label,
                    desc: def.desc,
                    unlockedAt: Date.now()
                });
                debugLog('Achievement', 'Unlocked:', def.label);

                // Update UI
                updateAchievementUI(def.id, true);
            }
        }
    } catch (err) {
        console.error('[Achievements] Check failed:', err);
    }
}
