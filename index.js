const express = require('express');
const fetch = require('node-fetch');
const Snap = require('node-snapchat-marketing');
const session = require('express-session')
const cookieParser = require('cookie-parser')
const path = require('path')
const app = express()
app.use(cookieParser())
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

const port = process.env.PORT || 3000

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//setup public folder
app.use(express.static('./public'));

const clientId = '35b3a399-a525-4712-8d0c-6ba97bb09092';
const clientSecret = '1dc10c4ed34de41d4cf9';
const redirectURI = 'https://dry-depths-23636.herokuapp.com/snap/callback';


const snap = new Snap({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectURI,
  });
app.get('/', (req, res) => {
    if (req.session.tokens) {
        snap.organization.getAll({ withAdAccounts: true }, function(err, orgs){
            if(err) {
                console.log(err);
                res.redirect('/snap/authorize');
                // res.json(err);
            } else {
                console.log(orgs);
                // res.json(orgs);
                res.render('organizations', {data: orgs})
            }
        });
    } else {
        res.redirect('/snap/authorize');
    }
});

app.get('/accounts', (req, res) => {
    let organizationId = '';
    if (req.query.organization_id) {
        organizationId = req.query.organization_id;
    }
    if (req.session.tokens) {
        const url = `https://adsapi.snapchat.com/v1/organizations/${organizationId}/adaccounts`;
        snap.request(url, { method: 'GET' }, function(err, accounts) {
            if(err) {
                console.log(err);
                res.redirect('/snap/authorize');
                // res.json(err);
            } else {
                console.log(accounts);
                // res.json(accounts);
                res.render('accounts', {data: accounts})
            }
        });
    } else {
        res.redirect('/snap/authorize');
    }
});

app.get('/accounts/stat', (req, res) => {
    let accountId = '';
    if (req.query.account_id) {
        accountId = req.query.account_id;
    }
    const url = `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/stats`;
    snap.request(url, { method: 'GET' }, function(err, stats) {
        if(err) {
            console.log(err);
            res.redirect('/snap/authorize');
            // res.json(err);
        } else {
            console.log(stats);
            res.json(stats);
        }
    });
});

app.get('/snap/authorize', function(req, res) {
    var url = snap.getAuthorizeUrl('snapchat-marketing-api');
    res.redirect(url);
});
app.get('/snap/callback', (req,res)=>{
    snap.authorization({ authorization_code: req.query.code }, function(err, token){
        console.log("Access token is: " + token.access_token);
        console.log("Refresh token is: " + token.refresh_token);
        console.log("Access token expires in: " + token.expires_in + " seconds");
        // res.redirect('/');
        req.session.tokens = JSON.stringify(token.access_token);
        req.session.save(function(err) {
        // session saved
        if(!err) {
            //Data get lost here
            res.redirect('/');
        }
        console.log('error', err)
        
        })
    });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})