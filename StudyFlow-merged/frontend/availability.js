
/* StudyFlow — Availability Management */

(function () {
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let blocks = [];

    // Convert HH:MM to minutes
    function toMinutes(time) {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
    }

    // Validate availability blocks
    function validBlock(block) {
        const validTime = t =>
            typeof t === "string" &&
            /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

        return Boolean(
            block &&
            typeof block.name === "string" &&
            block.name.trim() &&
            Array.isArray(block.days) &&
            block.days.length > 0 &&
            block.days.every(d => DAYS.includes(d)) &&
            validTime(block.start) &&
            validTime(block.end) &&
            toMinutes(block.start) < toMinutes(block.end)
        );
    }

    // Add a commitment
    function addBlock(block) {
        if (!validBlock(block)) {
            throw new Error("Invalid availability block");
        }

        const newBlock = {
            ...block,
            days: [...block.days],
            id: crypto.randomUUID(),
            updatedAt: Date.now()
        };

        blocks.push(newBlock);
        return newBlock;
    }

    // Update a commitment
    function updateBlock(id, changes) {
        const index = blocks.findIndex(b => b.id === id);
        if (index === -1) return null;

        const updated = {
            ...blocks[index],
            ...changes,
            updatedAt: Date.now(),
            id
        };

        if (!validBlock(updated)) {
            throw new Error("Invalid availability update");
        }

        blocks[index] = {
            ...updated,
            days: [...updated.days]
        };

        return blocks[index];
    }

    // Delete a commitment
    function deleteBlock(id) {
        const before = blocks.length;
        blocks = blocks.filter(b => b.id !== id);
        return blocks.length < before;
    }

    // Return all blocks
    function getBlocks() {
        return blocks.map(b => ({
            ...b,
            days: [...b.days]
        }));
    }

    // Load saved blocks
    function setBlocks(savedBlocks) {
        if (!Array.isArray(savedBlocks) ||
            !savedBlocks.every(validBlock)) {
            throw new Error("Invalid saved availability");
        }

        blocks = savedBlocks.map(b => ({
            ...b,
            days: [...b.days]
        }));
    }

    // Get unavailable intervals for a date range
    function getBlockedIntervals(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const result = [];

        if (!(start < end)) return result;

        const day = new Date(start);
        day.setHours(0, 0, 0, 0);

        while (day < end) {
            const dayName = DAYS[day.getDay()];

            for (const block of blocks) {
                if (!block.days.includes(dayName)) continue;

                const dateKey = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                if ((block.exceptions || []).some(x => x.originalDate === dateKey(day))) continue;
                const blockStart = new Date(day);
                const blockEnd = new Date(day);

                blockStart.setMinutes(toMinutes(block.start));
                blockEnd.setMinutes(toMinutes(block.end));

                const clippedStart = new Date(
                    Math.max(+blockStart, +start)
                );

                const clippedEnd = new Date(
                    Math.min(+blockEnd, +end)
                );

                if (clippedStart < clippedEnd) {
                    result.push({
                        id: block.id,
                        name: block.name,
                        type: block.type,
                        start: clippedStart,
                        end: clippedEnd
                    });
                }
            }

            const key = day.getFullYear() + '-' + String(day.getMonth()+1).padStart(2,'0') + '-' + String(day.getDate()).padStart(2,'0');
            for (const block of blocks) {
                for (const exception of block.exceptions || []) {
                    if (exception.date !== key) continue;
                    const a = new Date(day), b = new Date(day);
                    a.setMinutes(toMinutes(exception.start));
                    b.setMinutes(toMinutes(exception.end));
                    const clippedStart = new Date(Math.max(+a, +start));
                    const clippedEnd = new Date(Math.min(+b, +end));
                    if (clippedStart < clippedEnd) result.push({id:block.id,name:block.name,type:block.type,start:clippedStart,end:clippedEnd,originalDate:exception.originalDate});
                }
            }
            day.setDate(day.getDate() + 1);
        }

        return result.sort((a, b) => a.start - b.start);
    }

    // Get available intervals
    function getFreeIntervals(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (!(start < end)) return [];

        const busy = getBlockedIntervals(start, end);
        const free = [];
        let cursor = new Date(start);

        for (const interval of busy) {
            if (interval.start > cursor) {
                free.push({
                    start: new Date(cursor),
                    end: new Date(interval.start)
                });
            }

            if (interval.end > cursor) {
                cursor = new Date(interval.end);
            }
        }

        if (cursor < end) {
            free.push({
                start: new Date(cursor),
                end: new Date(end)
            });
        }

        return free;
    }

    // Check for scheduling conflicts
    function hasConflict(startDate, endDate) {
        return getBlockedIntervals(
            startDate,
            endDate
        ).length > 0;
    }

    // Make functions accessible to other files
    window.Availability = {
        addBlock,
        updateBlock,
        deleteBlock,
        getBlocks,
        setBlocks,
        getBlockedIntervals,
        getFreeIntervals,
        hasConflict
    };
})();
