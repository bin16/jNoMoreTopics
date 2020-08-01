// ==UserScript==
// @name         JNoMoreTopics
// @namespace    j_no_more_topics
// @version      0.2
// @description  Slowly and slowly, dislike all recommended topics (APP). | Why JavaScript? Because it works and looks good.
// @author       I dont know
// @match        https://web.okjike.com/
// @grant        none
// ==/UserScript==

(function () {
  // START
  (async function() {
    for (let r = 0; r < 500; r++) {
      console.log(`BEGIN TURN, R=${r}`);
      const TOPICS = [];
      sleep();
      const topics = await findTopics();
      if (topics.length === 0) {
        console.log('No more topics found, bye');
      }

      topics.forEach(t => TOPICS.push(t));
      console.log(`${ topics.length } topics updated.`);

      for (let i = 0; i < TOPICS.length; i++) {
        const t = TOPICS[i];
        await sleep();
        const ok = await dislikeTopic(t);
        if (!ok) {
          console.error('END');
          return;
        }
      }

      console.log(`END TURN, R=${r}`);
    }
  })();

  async function dislikeTopic(item) {
    const maxTries = 5;
    for (let i = 0; i < maxTries; i++) {
      await sleep(i << 2);
      const resp = await fetch('https://api.ruguoapp.com/1.0/recommendFeed/feedback', {
        method: 'POST',
        headers: prepareHeaders(),
        body: JSON.stringify(getReason(item)),
      });
      if (resp.status === 200) {
        return true;
      }
    }

    const topicTitle = item.topic.content || 'UNKNOWN?';
    console.error(`ERROR: Failed to dislike topic ${topicTitle} after ${maxTries} tries.`);
    return false;
  }

  async function findTopics() {
    const maxTries = 10; // Even more than 1 days
    for (let i = 0; i < maxTries; i++) {
      await sleep(i << 2);
      const resp = await fetch('https://api.ruguoapp.com/1.0/recommendFeed/list', {
        method: 'POST',
        headers: prepareHeaders(),
        body: JSON.stringify({
          limit: 20,
          trigger: "auto"
        }),
      });
      if (resp.status !== 200) {
        continue;
      }
      const res = await resp.json();
      if (res.data.length === 0) {
        console.warn('WARNING: TOPIC length is 0');
        sleep(i << 2); // Wait more seconds
        continue;
      }

      return res.data;
    }

    console.error(`ERROR: Failed to find topics after ${maxTries} tries.`);
    return [];
  }

  function sleep(sec = Math.floor(Math.random() * 10) + 3) {
    return new Promise(done => {
      setTimeout(() => done(), sec * 1000);
    });
  }

  function prepareHeaders() {
    const conf = getConfig();
    const headers = new Headers();
    const headMap = new Map([
      'manufacturer|Apple',
      'bundleid|com.ruguoapp.jike',
      'accept-language|zh-cn',
      'x-online-host|api.ruguoapp.com',
      'support-h265|true',
      'model|iPhone11,8',
      'app-permissions|0',
      'accept|*/*',
      'content-type|application/json',
      'os-version|Version 13.6 (Build 17G68)',
      'app-version|7.2.0',
      'wificonnected|true',
      'accept-encoding|gzip, deflate, br',
      'os|ios',
      'app-buildno|1744',
      'king-card-status|unknown',
      `client-request-id|${uuid()}`,
      'user-agent|%E5%8D%B3%E5%88%BB/1744 CFNetwork/1128.0.1 Darwin/19.6.0',
      `x-jike-device-id|${conf.deviceId}`,
      `x-jike-device-properties|{"idfa":"${conf.idfa}","idfv":"${conf.idfv}"}`,
    ].map(a => a.split('|')));
    headMap.forEach((value, name) => headers.append(name, value));
    headers.append('x-jike-access-token', getToken());
    return headers;
  }

  function getToken() {
    return new Map(document.cookie.split(';').map(a => a.trim()).map(a => a.split('='))).get('x-jike-access-token');
  }

  function getConfig() {
    const key = '_j_no_more_topics_';
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (err) {
      localStorage.setItem(key, JSON.stringify({
        deviceId: uuid(),
        idfa: uuid(),
        idfv: uuid(),
      }));
      return getConfig();
    }
  }

  function uuid() {
    return [
      randHex(8),
      randHex(4),
      (rand(5, 0) + 1).toString(16) + randHex(3),
      pickOne(['8', '9', 'a', 'b']) + randHex(3),
      randHex(12),
    ].join('-').toUpperCase();
  }

  function pickOne(items) {
    return items[rand(items.length)];
  }

  function randHex(len = 4) {
    // 1000 -> FFFF
    const maxHex = (Number.MAX_SAFE_INTEGER).toString(16).substr(1, len);
    const minHex = '0' + maxHex.substr(1).replace(/f/gi, '0');
    return rand(parseInt(maxHex, 16), parseInt(minHex, 16)).toString(16);
  }

  function rand(max, min = 0) {
    return Math.floor(Math.random() * max + min);
  }

  function getReason(recommendItem) {
    try {
      const items = recommendItem.dislikeMenu.reasons.filter(a => a.text.startsWith('屏蔽: '));
      if (items.length === 0) {
        throw new Error('Reason not found');
      }

      const { payload } = items[0];
      return {
        payload,
      }
    } catch (err) {
      console.error(err);
      const recommendId = recommendItem.id;
      const topicId = recommendItem.topic.id || '';
      return {
        payload: {
          reason: "TOPIC",
          topicId,
          key: topicId,
          type: "TOPIC",
          id: recommendId,
        }
      }
    }
  }
  // END
})();
