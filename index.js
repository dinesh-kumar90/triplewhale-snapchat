const express = require('express');
const fetch = require('node-fetch');
const moment = require('moment');
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

app.get('/campaigns', (req, res) => {
    let accountId = '';
    if (req.query.account_id) {
        accountId = req.query.account_id;
    }
    if (req.session.tokens) {
        const url = `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/campaigns`;
        snap.request(url, { method: 'GET' }, function(err, stats) {
            if(err) {
                console.log(err);
                res.redirect('/snap/authorize');
                // res.json(err);
            } else {
                console.log(stats);
                // res.json(stats);
                res.render('campaigns', {data: stats})
            }
        });
    } else {
        res.redirect('/snap/authorize');
    }
});

app.get('/accounts/stat', async (req, res) => {
    let accountId = '';
    if (req.query.account_id) {
        accountId = req.query.account_id;
    }
    let spend = 0;
    let revenue = 0;
    let roas = 0;
    const url = `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/campaigns`;
    await snap.request(url, { method: 'GET' }, function(err, stats) {
        if(err) {
            console.log(err);
            res.redirect('/snap/authorize');
        } else {
            stats.campaigns.map(async (campaign, index) => {
                const campaignId = campaign.campaign.id;
                let startTime = '';
                let endTime = '';
                if (req.query.start_time) {
                    startTime = `&start_time=${moment(req.query.start_time, 'MM/DD/YYYY').format('YYYY-MM-DDTHH:mm:ss.SSS')}-05:00`;
                }
                if (req.query.end_time) {
                    endTime = `&end_time=${moment(req.query.end_time, 'MM/DD/YYYY').format('YYYY-MM-DDTHH:mm:ss.SSS')}-05:00`;
                }
                const urlCampaign = `https://adsapi.snapchat.com/v1/campaigns/${campaignId}/stats?granularity=TOTAL${startTime}${endTime}&fields=conversion_purchases,conversion_purchases_value,impressions,swipes,spend`;
                await snap.request(urlCampaign, { method: 'GET' }, async function(err, statsCampaign) {
                    if(err) {
                        console.log(err);
                        res.json(err);
                    } else {
                        spend = spend + (statsCampaign.total_stats[0].total_stat.stats.spend / 1000000);
                        revenue = revenue + (statsCampaign.total_stats[0].total_stat.stats.conversion_purchases_value / 1000000);
                        if (index + 1 === stats.campaigns.length) {
                            setTimeout(() => {
                                roas = revenue / spend;
                                const responseData = {
                                    spend: spend,
                                    revenue: revenue,
                                    roas: roas,
                                    account_id: accountId,
                                    start_time: req.query.start_time,
                                    end_time: req.query.end_time,
                                };
                                res.render('accountStats', {data: responseData})
                                // res.json(responseData);
                            }, 4000)
                            
                        }
                    }
                });
            });
        }
    });
    
    // let startTime = '';
    // let endTime = '';
    // if (req.query.start_time) {
    //     startTime = `&start_time=${req.query.start_time}`;
    // }
    // if (req.query.end_time) {
    //     endTime = `&end_time=${req.query.end_time}`;
    // }
    // const url = `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/stats?granularity=TOTAL${startTime}${endTime}&fields=spend`;
    // snap.request(url, { method: 'GET' }, function(err, stats) {
    //     if(err) {
    //         console.log(err);
    //         // res.redirect('/snap/authorize');
    //         res.json(err);
    //     } else {
    //         console.log(stats);
    //         res.json(stats);
    //     }
    // });
});

app.get('/campaigns/stat', (req, res) => {
    let accountId = '';
    if (req.query.campaign_id) {
        accountId = req.query.campaign_id;
    }
    let startTime = '';
    let endTime = '';
    if (req.query.start_time) {
        startTime = `&start_time=${req.query.start_time}`;
    }
    if (req.query.end_time) {
        endTime = `&end_time=${req.query.end_time}`;
    }
    const url = `https://adsapi.snapchat.com/v1/campaigns/${accountId}/stats?granularity=TOTAL${startTime}${endTime}&fields=conversion_purchases,conversion_purchases_value,impressions,swipes,spend`;
    snap.request(url, { method: 'GET' }, function(err, stats) {
        if(err) {
            console.log(err);
            // res.redirect('/snap/authorize');
            res.json(err);
        } else {
            console.log(stats);
            res.render('stats', {data: stats})
            // let response = [];
            // stats.total_stats.map((st) => {
            //     let roas = st.total_stat.stats.conversion_purchases_value/st.total_stat.stats.spend;
            //     let statData = st;
            //     statData.total_stats.stats.roas = roas;
            //     response.push(statData);
            // });
            // res.json(response);
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