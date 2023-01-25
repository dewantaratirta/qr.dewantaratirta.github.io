var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/dewantaratirta/dewantaratirta.github.io.git', // Update to point to your repository  
        user: {
            name: 'Dewantara', // update to use your name
            email: 'Dewantara Tirta' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)