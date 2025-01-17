"use strict";

const responseFirendRequest = require('./core/responseFirendRequest');

const responseMemberJoinRequest = require('./core/responseMemberJoinRequest');

const responseBotInvitedJoinGroupRequest = require('./core/responseBotInvitedJoinGroupRequest');
/**
 * @description 为事件处理器提供中间件
 * @use 在 MiddleWare 的实例上链式调用需要的中间件方法，最后
 * 调用 done 并传入一个回调函数，该函数将在中间件结束后被调用
 */


class Middleware {
  constructor() {
    this.middleware = [];
    this.catcher = undefined;
  }
  /**
   * @description 自动重新登陆
   * @param {string} baseUrl  mirai-api-http server 的地址
   * @param {string} verifyKey  mirai-api-http server 设置的 verifyKey
   * @param {string} password 欲重新登陆的 qq 密码
   */


  autoReLogin({
    password
  }) {
    this.middleware.push(async (data, next) => {
      try {
        await data.bot.sendCommand({
          command: ['/login', data.qq, password]
        });
        await data.bot.open();
        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 自动重建 ws 连接
   */


  autoReconnection() {
    this.middleware.push(async (data, next) => {
      try {
        await data.bot.open();
        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤出指定类型的消息，消息类型为 key，对应类型的
   *              message 数组为 value，置于 data.classified
   * @param {string[]} typeArr message 的类型，例如 Plain Image Voice
   */


  messageProcessor(typeArr) {
    this.middleware.push(async (data, next) => {
      try {
        const result = {};
        typeArr.forEach(type => {
          result[type] = data.messageChain.filter(message => message.type == type);
        });
        data.classified = result;
        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤出字符串类型的 message，并拼接在一起，置于 data.text
   */


  textProcessor() {
    this.middleware.push(async (data, next) => {
      try {
        data.text = data.messageChain.filter(val => val.type == 'Plain').map(val => val.text).join('');
        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤出消息 id，置于 data.messageId
   */


  messageIdProcessor() {
    this.middleware.push(async (data, next) => {
      try {
        var _data$messageChain$;

        data.messageId = Array.isArray(data.messageChain) ? (_data$messageChain$ = data.messageChain[0]) === null || _data$messageChain$ === void 0 ? void 0 : _data$messageChain$.id : undefined;
        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤指定的群消息
   * @param {number[]} groupArr 允许通过的群号数组
   * @param {boolean}       allow    允许通过还是禁止通过
   */


  groupFilter(groupArr, allow = true) {
    const groupSet = new Set(groupArr);
    this.middleware.push(async (data, next) => {
      try {
        var _data$sender, _data$sender$group;

        // 检查参数
        if (!(data !== null && data !== void 0 && (_data$sender = data.sender) !== null && _data$sender !== void 0 && (_data$sender$group = _data$sender.group) !== null && _data$sender$group !== void 0 && _data$sender$group.id)) {
          throw new Error('Middleware.groupFilter 消息格式出错');
        } // 如果 id 在 set 里，根据 allow 判断是否交给下一个中间件处理


        if (groupSet.has(data.sender.group.id)) {
          return allow && next();
        }

        !allow && (await next());
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤指定的好友消息
   * @param {number[]} friendArr 好友 qq 号数组
   * @param {boolean}       allow     允许通过还是禁止通过
   */


  friendFilter(friendArr, allow = true) {
    const groupSet = new Set(friendArr);
    this.middleware.push(async (data, next) => {
      try {
        var _data$sender2;

        // 检查参数
        if (!(data !== null && data !== void 0 && (_data$sender2 = data.sender) !== null && _data$sender2 !== void 0 && _data$sender2.id)) {
          throw new Error('Middleware.friendFilter 消息格式出错');
        } // 如果 id 在 set 里，根据 allow 判断是否交给下一个中间件处理


        if (groupSet.has(data.sender.id)) {
          return allow && (await next());
        }

        !allow && (await next());
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤指定群的群成员的消息
   * @param {Map}     groupMemberMap 群和成员的 Map
   * @param {boolean} allow          允许通过还是禁止通过
   * 结构 { number => array[number], } key 为允许通过的群号，value 为该群允许通过的成员 qq
   */


  groupMemberFilter(groupMemberMap, allow = true) {
    // 每个 qq 数组变成 Set
    for (const group in groupMemberMap) {
      groupMemberMap[group] = new Set(groupMemberMap[group]);
    }

    this.middleware.push(async (data, next) => {
      try {
        var _data$sender3;

        // 检查参数
        if (!(data !== null && data !== void 0 && (_data$sender3 = data.sender) !== null && _data$sender3 !== void 0 && _data$sender3.id)) {
          throw new Error('Middleware.friendFilter 消息格式出错');
        } // 检查是否是群消息


        if (!data.sender.group) {
          return;
        } // 检查是否是允许通过的群成员，是则交给下一个中间件处理


        if (data.sender.group.id in groupMemberMap && groupMemberMap[data.sender.group.id].has(data.sender.id)) {
          return allow && (await next());
        }

        !allow && (await next());
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 这是一个对话锁，保证群中同一成员不能在中途触发处理器
   * @use 在你需要保护的过程结束后调用 data.unlock 即可
   */


  memberLock({
    autoUnlock = false
  } = {}) {
    const memberMap = {
      /* group -> memberSet */
    };
    this.middleware.push(async (data, next) => {
      try {
        var _data$sender4, _data$sender4$group, _data$sender5, _data$sender5$group, _data$sender7, _data$sender7$group, _data$sender8;

        // 检查参数
        if (!((_data$sender4 = data.sender) !== null && _data$sender4 !== void 0 && (_data$sender4$group = _data$sender4.group) !== null && _data$sender4$group !== void 0 && _data$sender4$group.id)) {
          throw new Error('Middleware.memberLock 消息格式出错');
        } // 若该 group 不存在对应的 Set，则添加


        if (!(memberMap[(_data$sender5 = data.sender) === null || _data$sender5 === void 0 ? void 0 : (_data$sender5$group = _data$sender5.group) === null || _data$sender5$group === void 0 ? void 0 : _data$sender5$group.id] instanceof Set)) {
          var _data$sender6, _data$sender6$group;

          memberMap[(_data$sender6 = data.sender) === null || _data$sender6 === void 0 ? void 0 : (_data$sender6$group = _data$sender6.group) === null || _data$sender6$group === void 0 ? void 0 : _data$sender6$group.id] = new Set();
        } // 是否正在对话


        if (memberMap[(_data$sender7 = data.sender) === null || _data$sender7 === void 0 ? void 0 : (_data$sender7$group = _data$sender7.group) === null || _data$sender7$group === void 0 ? void 0 : _data$sender7$group.id].has((_data$sender8 = data.sender) === null || _data$sender8 === void 0 ? void 0 : _data$sender8.id)) {
          // 正在对话则返回
          return;
        } else {
          var _data$sender9, _data$sender9$group, _data$sender10;

          // 未在对话，则加入对应的 Set，然后继续
          memberMap[(_data$sender9 = data.sender) === null || _data$sender9 === void 0 ? void 0 : (_data$sender9$group = _data$sender9.group) === null || _data$sender9$group === void 0 ? void 0 : _data$sender9$group.id].add((_data$sender10 = data.sender) === null || _data$sender10 === void 0 ? void 0 : _data$sender10.id);
          let locked = true;

          const unlock = () => {
            var _data$sender11, _data$sender11$group, _data$sender12;

            memberMap[(_data$sender11 = data.sender) === null || _data$sender11 === void 0 ? void 0 : (_data$sender11$group = _data$sender11.group) === null || _data$sender11$group === void 0 ? void 0 : _data$sender11$group.id].delete((_data$sender12 = data.sender) === null || _data$sender12 === void 0 ? void 0 : _data$sender12.id);
            locked = false;
          };

          data.unlock = unlock; // 等待下游中间件结束后 unlock

          await next();
          autoUnlock && locked && unlock();
        }
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 这是一个对话锁，保证同一好友不能在中途触发处理器
   * @use 在你需要保护的过程结束后调用 data.unlock 即可
   */


  friendLock({
    autoUnlock = false
  } = {}) {
    const friendSet = new Set();
    this.middleware.push(async (data, next) => {
      try {
        var _data$sender13, _data$sender14;

        // 检查参数
        if (!((_data$sender13 = data.sender) !== null && _data$sender13 !== void 0 && _data$sender13.id)) {
          throw new Error('Middleware.memberLock 消息格式出错');
        } // 是否正在对话


        if (friendSet.has((_data$sender14 = data.sender) === null || _data$sender14 === void 0 ? void 0 : _data$sender14.id)) {
          // 正在对话则返回
          return;
        } else {
          var _data$sender15;

          // 未在对话，则加入 Set，然后继续
          friendSet.add((_data$sender15 = data.sender) === null || _data$sender15 === void 0 ? void 0 : _data$sender15.id);
          let locked = true;

          const unlock = () => {
            var _data$sender16;

            friendSet.delete((_data$sender16 = data.sender) === null || _data$sender16 === void 0 ? void 0 : _data$sender16.id);
            locked = false;
          };

          data.unlock = unlock; // 等待下游中间件结束后 unlock

          await next();
          autoUnlock && locked && unlock();
        }
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 过滤包含指定 @ 信息的消息
   * @param {number[]} atArr 必选，qq 号数组
   * @param {boolean}       allow 可选，允许通过还是禁止通过
   */


  atFilter(friendArr, allow = true) {
    const friendSet = new Set(friendArr);
    this.middleware.push(async (data, next) => {
      try {
        // 检查参数
        if (!(data !== null && data !== void 0 && data.messageChain)) {
          throw new Error('Middleware.atFilter 消息格式出错');
        } // 如果 id 在 set 里，根据 allow 判断是否交给下一个中间件处理


        for (const message of data.messageChain) {
          if ((message === null || message === void 0 ? void 0 : message.type) == 'At' && friendSet.has(message === null || message === void 0 ? void 0 : message.target)) {
            return allow && (await next());
          }
        }

        !allow && (await next());
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 用于 NewFriendRequestEvent 的中间件，经过该中间件后，将在 data 下放置三个方法
   * agree、refuse、refuseAndAddBlacklist，调用后将分别进行好友请求的 同意、拒绝和拒绝并加入黑名单
   */


  friendRequestProcessor() {
    this.middleware.push(async (data, next) => {
      try {
        // 事件类型
        if (data.type != 'NewFriendRequestEvent') {
          throw new Error('Middleware.NewFriendRequestEvent 消息格式出错');
        } // ? baseUrl, sessionKey 放在内部获取，使用最新的实例状态


        const baseUrl = data.bot.getBaseUrl();
        const sessionKey = data.bot.getSessionKey();
        const {
          eventId,
          fromId,
          groupId
        } = data; // 同意

        data.agree = async message => {
          await responseFirendRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 0
          });
        }; // 拒绝


        data.refuse = async message => {
          await responseFirendRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 1
          });
        }; // 拒绝并加入黑名单


        data.refuseAndAddBlacklist = async message => {
          await responseFirendRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 2
          });
        };

        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 用于 MemberJoinRequestEvent 的中间件，经过该中间件后，将在 data 下放置五个方法
   * agree                 同意
   * refuse                拒绝
   * ignore                忽略
   * refuseAndAddBlacklist 拒绝并移入黑名单
   * ignoreAndAddBlacklist 忽略并移入黑名单
   */


  memberJoinRequestProcessor() {
    this.middleware.push(async (data, next) => {
      try {
        // 事件类型
        if (data.type != 'MemberJoinRequestEvent') {
          throw new Error('Middleware.memberJoinRequestProcessor 消息格式出错');
        } // ? baseUrl, sessionKey 放在内部获取，使用最新的实例状态


        const baseUrl = data.bot.getBaseUrl();
        const sessionKey = data.bot.getSessionKey();
        const {
          eventId,
          fromId,
          groupId
        } = data; // 同意

        data.agree = async message => {
          await responseMemberJoinRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 0
          });
        }; // 拒绝


        data.refuse = async message => {
          await responseMemberJoinRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 1
          });
        }; // 忽略


        data.ignore = async message => {
          await responseMemberJoinRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 2
          });
        }; // 拒绝并加入黑名单


        data.refuseAndAddBlacklist = async message => {
          await responseMemberJoinRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 3
          });
        }; // 忽略并加入黑名单


        data.ignoreAndAddBlacklist = async message => {
          await responseMemberJoinRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 4
          });
        };

        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * ! 自动同意时，不会触发该事件
   * @description 用于 BotInvitedJoinGroupRequestEvent 的中间件，经过该中间件后，将在 data 下放置两个方法
   * agree                 同意
   * refuse                拒绝
   */


  invitedJoinGroupRequestProcessor() {
    this.middleware.push(async (data, next) => {
      try {
        // 事件类型
        if (data.type != 'BotInvitedJoinGroupRequestEvent') {
          throw new Error('Middleware.invitedJoinGroupRequestProcessor 消息格式出错');
        } // ? baseUrl, sessionKey 放在内部获取，使用最新的实例状态


        const baseUrl = data.bot.getBaseUrl();
        const sessionKey = data.bot.getSessionKey();
        const {
          eventId,
          fromId,
          groupId
        } = data; // 同意

        data.agree = async message => {
          await responseBotInvitedJoinGroupRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 0
          });
        }; // 拒绝


        data.refuse = async message => {
          await responseBotInvitedJoinGroupRequest({
            baseUrl,
            sessionKey,
            eventId,
            fromId,
            groupId,
            message,
            operate: 1
          });
        };

        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description Waiter 的包装器，提供方便的同步 IO 方式
   */


  syncWrapper() {
    this.middleware.push(async (data, next) => {
      try {
        // 事件类型
        if (data.type != 'GroupMessage' && data.type != 'FriendMessage') {
          throw new Error('Middleware.syncWrapper 消息格式出错');
        }

        data.waitFor = {
          messageChain: () => {
            var _data$bot, _data$bot$waiter;

            return (_data$bot = data.bot) === null || _data$bot === void 0 ? void 0 : (_data$bot$waiter = _data$bot.waiter) === null || _data$bot$waiter === void 0 ? void 0 : _data$bot$waiter.wait(data.type, ({
              messageChain
            }) => messageChain);
          },
          text: () => {
            var _data$bot2, _data$bot2$waiter;

            return (_data$bot2 = data.bot) === null || _data$bot2 === void 0 ? void 0 : (_data$bot2$waiter = _data$bot2.waiter) === null || _data$bot2$waiter === void 0 ? void 0 : _data$bot2$waiter.wait(data.type, new Middleware().textProcessor().done(({
              text
            }) => text));
          },
          custom: processor => {
            var _data$bot3, _data$bot3$waiter;

            return (_data$bot3 = data.bot) === null || _data$bot3 === void 0 ? void 0 : (_data$bot3$waiter = _data$bot3.waiter) === null || _data$bot3$waiter === void 0 ? void 0 : _data$bot3$waiter.wait(data.type, processor);
          }
        };
        await next();
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 添加一个自定义中间件
   * @param {function} callback (data, next) => void
   */


  use(callback) {
    this.middleware.push(async (data, next) => {
      // 捕获错误
      try {
        await callback(data, next);
      } catch (error) {
        if (this.catcher) {
          this.catcher(error);
        } else {
          throw error;
        }
      }
    });
    return this;
  }
  /**
   * @description 使用错误处理器
   * @param {function} catcher 错误处理器 (err) => void
   */


  catch(catcher) {
    this.catcher = catcher;
    return this;
  }
  /**
   * @description 生成一个带有中间件的事件处理器
   * @param {function} callback 事件处理器
   */


  done(callback) {
    return data => {
      return new Promise(resolve => {
        // 从右侧递归合并中间件链
        this.middleware.reduceRight((next, middleware) => {
          return async () => await middleware(data, next);
        }, async () => {
          // 最深层递归，即开发者提供的回调函数
          let returnVal = callback instanceof Function ? await callback(data) : undefined; // 异步返回

          resolve(returnVal);
        })();
      });
    };
  }

}

module.exports = {
  Middleware
};