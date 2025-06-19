const AWS = require('aws-sdk');

exports.handler = async (event) => {
    const regionInfoMap = {
        'ap-southeast-2':['AusApplicationClientErrrors','AusApplicationServerErrors'],
        'eu-west-2':['UKApplicationServerErrrors','UKApplicationClientErrrors']
    };
    const sns = new AWS.SNS({ region:'ap-southeast-2'});
    //iterate through the regionInfoMap
     for (const [targetRegion, alarmNames] of Object.entries(regionInfoMap)) {
        console.log(`Region: ${targetRegion}`);
        console.log(`Alarm Names: ${alarmNames}`);

        const cloudwatch = new AWS.CloudWatch({ region: targetRegion });
        const snsTopicArn = 'arn:aws:sns:ap-southeast-2:257913572854:applicationErrors';

        try {
            console.log(`Alarms : ${alarmNames}`);
            for(alarmName of alarmNames){
                console.log(`Checking Alarm : ${alarmName}`);
                // Describe the alarm to get its current state
               const alarmResponse = await cloudwatch.describeAlarms({ AlarmNames: [alarmName] }).promise();
                const alarmState = alarmResponse.MetricAlarms[0]?.StateValue;

                console.log(`Alarm '${alarmName}' is in state: ${alarmState}`);

                if (alarmState === 'ALARM') {
                    let message = '';

                    if (alarmName.includes('Client')) {
                        message = `'${alarmName}' is more than threshold - (usually more than 25 client errors in last 1 hour). Please check the CloudWatch alarms for more details.\n\nFollow this guide if you are not familiar: https://docs.google.com/document/d/1VEIwpgjjZvvo9I8zUKKM7IVdWjKTwuuIq4h9PBquERE/edit?usp=sharing`;
                    }

                    if (alarmName.includes('Server')) {
                        message = `'${alarmName}' is more than threshold - (usually more than 10 server errors in last 1 hour). Please check the CloudWatch alarms for more details.\n\nFollow this guide if you are not familiar: https://docs.google.com/document/d/1VEIwpgjjZvvo9I8zUKKM7IVdWjKTwuuIq4h9PBquERE/edit?usp=sharing`;
                    }

                    if (message) {
                        const snsResponse = await sns.publish({
                            TopicArn: snsTopicArn,
                            Message: message,
                            Subject: `Application Errors Alert - ${alarmName}`,
                        }).promise();

                        console.log('SNS Notification Sent:', snsResponse);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking alarm state or sending notification:', error);
            throw error;
        }
    }
};
