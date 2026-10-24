/**
 * GENFREX Unified Business Management Platform - Seed Script
 * 
 * NOTICE: Automatic demo seeding is permanently DISABLED per system policy.
 * All accounts (Admin, HR, Employee, Client), projects, tasks, and appointment
 * letters must be manually created through the application interface.
 * 
 * First-Time Setup:
 * Navigate to /setup-admin on the client web application to configure your
 * primary Administrator account.
 */

console.log('================================================================');
console.log('⚠️  GENFREX DEMO SEEDING IS DISABLED');
console.log('   Automatic sample/demo record insertion has been removed.');
console.log('   Please initialize your system via the First-Time Admin Setup');
console.log('   portal at: http://localhost:5173/setup-admin');
console.log('================================================================');

if (require.main === module) {
  process.exit(0);
}

module.exports = () => {
  console.log('[Seed] Demo seeding is disabled.');
};
