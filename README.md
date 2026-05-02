Usign AWS EC2 for Demo purpose.
Spinned up EC2, installed Node.JS
https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html
Add TCP 5000 into security group to allow incoming connection
To keep the service alive incase if SSH timeout
# mkdir -p condobook/public
Local machine $ scp -i "your-key.pem" CondoBook_Frontend.html ec2-user@<EC2-PUBLIC-IP>:~/condo-booking/public/index.html
Local machine$ scp -i your-key.pem CondoBook_Backend_server.js ubuntu@<EC2-PUBLIC-IP>:~/condo-booking/server.js
Alternatively you can pull from Github
Install & Setup Node.JS
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# source ~/.bashrc
# nvm install --lts
# node -e "console.log('Running Node.js ' + process.version)"
This displays the following message that shows the version of Node.js that is running.
Running Node.js VERSION
# npm install -g pm2
# pm2 start server.js --name condobook
# pm2 status all | To see the status.
