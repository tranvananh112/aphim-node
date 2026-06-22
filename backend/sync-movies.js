// Script to sync movies from Ophim API to local database
const ophimService = require('./services/ophimService');

async function syncMovies() {
    console.log('🎬 Starting movie sync from Ophim API...\n');

    try {
        // Sync first page of movies
        console.log('📥 Syncing page 1...');
        const result = await ophimService.syncMoviesFromPage(1);

        console.log(`\n✅ Sync completed!`);
        console.log(`   Total movies: ${result.total}`);
        console.log(`   Successfully synced: ${result.synced}`);
        console.log(`   Failed: ${result.total - result.synced}`);

        if (result.movies.length > 0) {
            console.log('\n📋 Sample movies:');
            result.movies.slice(0, 5).forEach(movie => {
                console.log(`   - ${movie.name} (${movie.year})`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error syncing movies:', error.message);
        process.exit(1);
    }
}

syncMovies();
