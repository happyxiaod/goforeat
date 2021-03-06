import React, { PureComponent } from "react";
import {
  Image,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView
} from "react-native";
import { Input, Icon, ActionSheet } from "native-base";
//utils
import GLOBAL_PARAMS from "./utils/global_params";
import ToastUtil from "./utils/ToastUtil";
//cache
import { userStorage } from "./cache/appStorage";
//api
import { getCode, checkCode, saveDevices } from "./api/request";
import source from "./api/CancelToken";
//language
import i18n from "./language/i18n";
//jpush
import JPushModule from "jpush-react-native";
//styles
import LoginStyle from "./styles/login.style";
import CommonStyle from "./styles/common.style";
//components
import CommonBottomBtn from "./components/CommonBottomBtn";
import Text from "./components/UnScalingText";
import I18n from "./language/i18n";

const BUTTONS = [
  GLOBAL_PARAMS.phoneType.HK.label,
  GLOBAL_PARAMS.phoneType.CHN.label,
  "Cancel"
];
const DESTRUCTIVE_INDEX = 3;
const CANCEL_INDEX = 2;

export default class CustomLoginView extends PureComponent {
  _textInput = null;
  token = null;
  _timer = null;
  _actionSheet = null;
  phone = null;
  password = null;
  state = {
    phone: null,
    password: null,
    selectedValue: GLOBAL_PARAMS.phoneType.HK,
    codeContent: I18n[this.props.screenProps.language].sendCode,
    isCodeDisabled: false,
    isKeyBoardShow: false,
    i18n: I18n[this.props.screenProps.language]
  };

  componentWillUnmount() {
    source.cancel();
    clearInterval(this.interval);
    clearTimeout(this._timer);
  }

  //common function

  _keyboardDidShow(e) {
    // this._keyboard_height = e.startCoordinates.height - e.endCoordinates.height;
    this._toggleKeyBoard(1);
  }

  _keyboardDidHide() {
    this._toggleKeyBoard(0);
  }

  _sendPhoneAndGetCode() {
    let { i18n } = this.state;
    if (this.phone === null) {
      ToastUtil.showWithMessage(i18n.login_tips.fail.phone_null);
      return;
    }
    getCode(this.phone, this.state.selectedValue.value).then(
      data => {
        if (data.ro.respCode == "0000") {
          this.token = data.data.token;
          ToastUtil.showWithMessage(i18n.login_tips.success.code);
          let _during = 60;
          this.interval = setInterval(() => {
            _during--;
            this.setState({
              codeContent: `${_during}${
                i18n.login_tips.common.resendAfterSceond
              }`,
              isCodeDisabled: true
            });
            if (_during === 0) {
              this.setState({
                codeContent: i18n.login_tips.common.resend,
                isCodeDisabled: false
              });
              clearInterval(this.interval);
            }
          }, 1000);
        } else {
          ToastUtil.showWithMessage(data.ro.respMsg);
        }
      },
      () => {
        ToastUtil.showWithMessage(i18n.login_tips.fail.code);
      }
    );
  }

  _getPhone(phone) {
    this.phone = phone;
  }

  _getPassword(password) {
    this.password = password;
  }

  _login() {
    let { i18n } = this.state;
    let { params } = this.props.navigation.state;
    let { selectedValue, password } = this.state;
    if (this.phone === null) {
      ToastUtil.showWithMessage(i18n.login_tips.fail.phone_null);
      return;
    }
    if (this.password === null) {
      ToastUtil.showWithMessage(i18n.login_tips.fail.code_null);
      return;
    }
    this.props.showLoadingModal();
    checkCode(this.phone, selectedValue.value, this.token, this.password)
      .then(data => {
        this.props.hideLoadingModal();
        if (data.ro.respCode == "0000") {
          ToastUtil.showWithMessage(i18n.login_tips.success.login);
          const { account, sid, nickName, profileImg } = data.data;
          let _user = {
            username: account,
            sid,
            nickName,
            profileImg
          };
          userStorage.setData(_user);
          this.props.screenProps.userLogin(_user);
          this.props.screenProps.toggleLogin(false);
          let _timer = setTimeout(() => {
            this.props.navigation.navigate(this.props.screenProps.toPage);
            clearTimeout(_timer);
          }, 300);
          // if(typeof params === 'undefined') {
          //   this.props.navigation.goBack()
          // }else {
          //   if(params.page == 'Order') {
          //     this.props.navigation.navigate('Order',
          //       {
          //           replaceRoute: true,
          //           ...params
          //       })
          //   }else {
          //     let {callback} = this.props.navigation.state.params;
          //     this.props.navigation.goBack();
          //     requestAnimationFrame(() => {
          //       callback();
          //     })
          //   }
          // }
          JPushModule.getRegistrationID(
            registrationId => {
              saveDevices(registrationId, data.data.sid).then(sdata => {});
            },
            () => {
              ToastUtil.showWithMessage(i18n.login_tips.fail.login);
            }
          );
        } else {
          this.props.hideLoadingModal();
          ToastUtil.showWithMessage(data.ro.respMsg);
        }
      })
      .catch(err => {
        this.props.hideLoadingModal();
        ToastUtil.showWithMessage(i18n.common_tips.err);
      });
  }

  _showActionSheet = () => {
    let { i18n } = this.state;
    if (this._actionSheet !== null) {
      // Call as you would ActionSheet.show(config, callback)
      this._actionSheet._root.showActionSheet(
        {
          options: BUTTONS,
          cancelButtonIndex: CANCEL_INDEX,
          destructiveButtonIndex: DESTRUCTIVE_INDEX,
          title: i18n.login_tips.common.choosePhone
        },
        buttonIndex => {
          switch (BUTTONS[buttonIndex]) {
            case GLOBAL_PARAMS.phoneType.HK.label:
              this.setState({ selectedValue: GLOBAL_PARAMS.phoneType.HK });
              break;
            case GLOBAL_PARAMS.phoneType.CHN.label:
              this.setState({ selectedValue: GLOBAL_PARAMS.phoneType.CHN });
              break;
          }
        }
      );
    }
  }

  //render function

  _renderTopImage() {
    let { navigation } = this.props;
    return (
      <View style={LoginStyle.TopImageView}>
        <Image
          source={require("./asset/login_bg.png")}
          style={LoginStyle.TopImage}
          reasizeMode="cover"
        />
        <View style={LoginStyle.TopImageViewInner}>
          <Image
            source={require("./asset/logoTop.png")}
            style={LoginStyle.TopImageViewTitle}
          />
        </View>
        <TouchableOpacity
          style={LoginStyle.CloseBtn}
          onPress={() => this.props.screenProps.toggleLogin(false)}
        >
          <Icon name="ios-arrow-back" style={LoginStyle.CloseImage} />
        </TouchableOpacity>
      </View>
    );
  }

  _renderContentView() {
    let { i18n } = this.state;
    return (
      <View style={LoginStyle.ContentView}>
        <Text style={LoginStyle.Title}>{i18n.signInPhone}</Text>
        <View style={LoginStyle.CommonView}>
          <View style={LoginStyle.CommonInputView}>
            <Image
              source={require("./asset/phone.png")}
              style={LoginStyle.Icon}
              reasizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => this._showActionSheet()}
              style={LoginStyle.ChangePhoneTypeBtn}
            >
              <Text style={LoginStyle.PhoneTypeText}>
                {this.state.selectedValue.label}
              </Text>
              <Image
                reasizeMode="cover"
                source={require("./asset/arrowdown.png")}
                style={LoginStyle.ArrowDown}
              />
            </TouchableOpacity>
            <Input
              ref={t => (this._textInput = t)}
              allowFontScaling={false}
              onChangeText={phone => this._getPhone(phone)}
              style={LoginStyle.CommonInput}
              multiline={false}
              autoFocus={false}
              placeholder={i18n.fillInPhone}
              keyboardType="numeric"
              clearButtonMode="while-editing"
              placeholderTextColor="#999999"
              maxLength={11}
              returnKeyType="done"
            />
          </View>
          <View style={LoginStyle.CommonInputView}>
            <Image
              source={require("./asset/password.png")}
              style={LoginStyle.Icon}
              reasizeMode="cover"
            />
            <Input
              onChangeText={password => this._getPassword(password)}
              style={LoginStyle.CommonInput}
              allowFontScaling={false}
              multiline={false}
              autoFocus={false}
              placeholder={i18n.fillInCode}
              clearButtonMode="while-editing"
              placeholderTextColor="#999999"
              returnKeyType="done"
              keyboardType="numeric"
              maxLength={6}
            />
            <TouchableOpacity
              style={[
                LoginStyle.SendBtn,
                {
                  borderColor: this.state.isCodeDisabled ? "#ff4141" : "#999999"
                }
              ]}
              disabled={this.state.isCodeDisabled}
              onPress={() => this._sendPhoneAndGetCode()}
            >
              <Text
                style={[
                  LoginStyle.SendText,
                  { color: this.state.isCodeDisabled ? "#ff4141" : "#999999" }
                ]}
              >
                {this.state.codeContent}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <CommonBottomBtn clickFunc={() => this._login()}>
          {i18n.loginOrRegister}
        </CommonBottomBtn>
      </View>
    );
  }

  _renderDividerView() {
    return (
      <View style={CommonStyle.DividerView}>
        <View style={CommonStyle.Divider} />
        <Text style={CommonStyle.DividerText}>或</Text>
        <View style={CommonStyle.Divider} />
      </View>
    );
  }

  _renderBottomView() {
    return (
      <View style={CommonStyle.BottomView}>
        {this._renderDividerView()}
        <View style={CommonStyle.BottomViewInner}>
          <Image
            source={require("./asset/facebook2.png")}
            style={CommonStyle.BottomViewInnerImage}
          />
          <Image
            source={require("./asset/wechat.png")}
            style={CommonStyle.BottomViewInnerImage}
          />
        </View>
      </View>
    );
  }

  render() {
    return (
      <KeyboardAvoidingView
        style={[
          LoginStyle.LoginContainer
        ]}
      >
        {this._renderTopImage()}
        {this._renderContentView()}
        {/*this._renderBottomView()*/}
        <ActionSheet
          ref={a => {
            this._actionSheet = a;
          }}
        />
      </KeyboardAvoidingView>
    );
  }
}
