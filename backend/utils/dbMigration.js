export class DbMigrationEngine {
    constructor() {
        this.usersTable = [];
        this.phase = 'EXPAND';
    }

    setPhase(phase) {
        this.phase = phase;
        console.log(`   [DB Migration] Phase Transition: Set schema migration state to "${phase}".`);
        if (phase === 'CONTRACT') {
            this.usersTable = this.usersTable.map(user => {
                const { first_name, last_name, ...contractedUser } = user;
                return contractedUser;
            });
            console.log(`   [DB Migration] Contract: Dropped legacy fields "first_name" and "last_name" from database schema.`);
        }
    }

    insertUser(id, firstName, lastName) {
        let record = { id };
        if (this.phase === 'EXPAND' || this.phase === 'SYNC') {
            record.first_name = firstName;
            record.last_name = lastName;
            record.fullname = `${firstName} ${lastName}`;
        } else if (this.phase === 'CONTRACT') {
            record.fullname = `${firstName} ${lastName}`;
        }
        this.usersTable.push(record);
        return record;
    }

    backfillHistory() {
        let updatedCount = 0;
        this.usersTable = this.usersTable.map(user => {
            if (!user.fullname && user.first_name && user.last_name) {
                user.fullname = `${user.first_name} ${user.last_name}`;
                updatedCount++;
            }
            return user;
        });
        console.log(`   [DB Migration] Sync: Backfilled ${updatedCount} historical records to new schema structure.`);
        return updatedCount;
    }

    readUser(id) {
        const user = this.usersTable.find(u => u.id === id);
        if (!user) return null;

        if (this.phase === 'CONTRACT') {
            return { id: user.id, fullname: user.fullname };
        }

        return {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            fullname: user.fullname || `${user.first_name} ${user.last_name}`
        };
    }
}
