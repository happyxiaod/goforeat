import React, { Component } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Platform,
  Image
} from "react-native";
import { Container, Content, Icon } from "native-base";
import Picker from "react-native-picker";
//components
import CommonHeader from "../components/CommonHeader";
import CommonBottomBtn from "../components/CommonBottomBtn";
import Text from "../components/UnScalingText";
import SlideUpPanel from "../components/SlideUpPanel";
//styles
import CreditCardStyles from "../styles/creditcard.style";
//utils
import ToastUtils from "../utils/ToastUtil";
import { em, client, setPayType } from "../utils/global_params";
//cache
import { creditCardStorage, payTypeStorage } from "../cache/appStorage";
//api
import { vaildCard, setCreditCard } from "../api/request";
//language
import I18n from "../language/i18n";

export default class CreditCardView extends Component {
  constructor(props) {
    super(props);
    let { creditCardInfo } = props.screenProps;
    this._raw_card = "";
    this.i18n = props.i18n;
    this.state = {
      name: creditCardInfo ? creditCardInfo.name : "",
      card: "",
      time: "",
      cvc: "",
      isModalVisible: true
    };
  }

  componentWillMount() {
    this.keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", e =>
      this._keyboardDidShow(e)
    );
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
  }

  componentDidMount() {
    this._showDatePicker();
  }

  componentWillUnmount() {
    Picker.hide();
  }

  //logic
  _getName(name) {
    this.setState({
      name
    });
  }

  _getCard(card) {
    this._raw_card = card.split(" ").join("");
    if (this._raw_card.length % 4 == 0 && this._raw_card.length < 16) {
      card = card + " ";
    }
    this.setState({
      card
    });
  }

  _getTime(time) {
    this.setState({
      time
    });
  }

  _getCVC(cvc) {
    this.setState({
      cvc
    });
  }

  _createDateData() {
    let _date = new Date();
    let month = [];
    for (let i = 1; i < 13; i++) {
      let year = [];
      for (let j = _date.getFullYear(); j < 2050; j++) {
        year.push(j + "年");
      }
      let _month = {};
      _month[i + "月"] = year;
      month.push(_month);
    }
    return month;
  }

  _showDatePicker() {
    let _today = new Date();
    let _selected_val = [
      `${_today.getMonth() + 1}月`,
      _today.getFullYear() + "年"
    ];

    Picker.init({
      pickerData: this._createDateData(),
      pickerFontColor: [255, 0, 0, 1],
      pickerTitleText: "",
      pickerConfirmBtnText: this.i18n.confirm,
      pickerCancelBtnText: this.i18n.cancel,
      pickerConfirmBtnColor: [255, 76, 20, 1],
      pickerCancelBtnColor: [102, 102, 102, 1],
      pickerToolBarBg: [255, 255, 255, 1],
      pickerBg: [255, 255, 255, 1],
      wheelFlex: [1, 1],
      pickerFontSize: 16,
      pickerFontColor: [51, 51, 51, 1],
      pickerRowHeight: 45,
      selectedValue: _selected_val,
      onPickerConfirm: (pickedValue, pickedIndex) => {
        if (pickedValue[0].length < 3) {
          pickedValue[0] = pickedValue[0].substr(0, 1);
        } else {
          pickedValue[0] = pickedValue[0].substr(0, 2);
        }
        pickedValue[1] = pickedValue[1].substr(2, 2);
        if (pickedValue[0] < 10) {
          pickedValue[0] = `0${pickedValue[0]}`;
        }
        this.setState({
          time: pickedValue.join("/")
        });
      }
    });
  }

  _keyboardDidShow(e) {
    Picker.hide();
  }

  _bindCard() {
    const { cvc, time } = this.state;
    const { showLoadingModal, hideLoadingModal } = this.props;
    const { callback } = this.props.navigation.state.params;
    for (let i in this.state) {
      if (this.state[i] == "") {
        switch (i) {
          case "card":
            ToastUtils.showWithMessage(
              this.i18n.credit_card_tips.card_not_null
            );
            return;
          case "time":
            ToastUtils.showWithMessage(
              this.i18n.credit_card_tips.time_not_null
            );
            return;
          case "cvc":
            ToastUtils.showWithMessage(this.i18n.credit_card_tips.cvc_not_null);
            return;
        }
      }
    }
    showLoadingModal();
    client
      .createToken({
        number: this._raw_card,
        exp_month: time.substr(0, 2),
        exp_year: time.substr(3, 2),
        cvc: cvc
      })
      .then(token => {
        if (token && token.hasOwnProperty("id")) {
          return setCreditCard(token.id, time, this._raw_card.substr(-4));
        } else {
          throw token.error;
        }
      })
      .then(data => {
        hideLoadingModal();
        if (data && data.ro.ok) {
          callback && callback();
          ToastUtils.showWithMessage(this.i18n.credit_card_tips.bind_success);
          this.props.navigation.goBack();
        } else {
          ToastUtils.showWithMessage(this.i18n.credit_card_tips.bind_fail);
        }
        console.log({ data });
      })
      .catch(err => {
        console.log({ err });
        hideLoadingModal();
        if (err.hasOwnProperty("type")) {
          ToastUtils.showWithMessage(
            this.i18n.credit_card_tips.card_number_error
          );
        } else {
          ToastUtils.showWithMessage(this.i18n.credit_card_tips.bind_fail);
        }
      });
  }

  _renderCommonInput(item, key) {
    if (item.label == this.i18n.date) {
      return (
        <View
          style={
            Platform.OS == "ios"
              ? CreditCardStyles.CommonInputView
              : CreditCardStyles.CommonInputAndroidView
          }
          key={key}
        >
          <Text style={CreditCardStyles.InputTitle}>{item.label}</Text>
          <TouchableOpacity
            style={CreditCardStyles.SelectBtn}
            onPress={() => {
              Picker.show();
              Keyboard.dismiss();
            }}
          >
            <Text style={{ color: "#333333", fontSize: em(16) }}>
              {this.state.time != "" ? this.state.time : this.i18n.timeRequire}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View
        style={
          Platform.OS == "ios"
            ? CreditCardStyles.CommonInputView
            : CreditCardStyles.CommonInputAndroidView
        }
        key={key}
      >
        <Text style={CreditCardStyles.InputTitle}>{item.label}</Text>
        <TextInput
          allowFontScaling={false}
          style={
            Platform.OS == "android"
              ? CreditCardStyles.Input_Android
              : CreditCardStyles.Input
          }
          clearButtonMode="while-editing"
          underlineColorAndroid="transparent"
          keyboardType={item.keyboard}
          placeholder={item.placeholder}
          maxLength={item.maxlength}
          onChangeText={item.changeTextFunc}
          defaultValue={this.state[item.name]}
          clearButtonMode="never"
          placeholderTextColor="#333333"
        />
      </View>
    );
  }

  _renderInfoDetailPanel() {
    const _arr = [
      {
        img: require("../asset/stripe.png"),
        title: "符合業界標準的保安技術",
        desc: "有得食選用stripe 支付系統。現時Facebook、Uber 都使用這套系統。"
      },
      {
        img: require("../asset/card.png"),
        title: "卡信息由stripe存取",
        desc:
          "您的信用卡信息由stripe存取和保護，有得食伺服器不會儲存任何信用卡資料。"
      },
      {
        img: require("../asset/dollar.png"),
        title: "為何會收到一個$0的賬單",
        desc:
          "為確保有效,stripe會進行一次$0元扣款測試,您的賬戶不會扣除任何費用。"
      }
    ];
    return (
      <SlideUpPanel ref={r => (this.slideUpPanel = r)}>
        <Text style={CreditCardStyles.panelTitle}>有得食重視支付安全</Text>
        {_arr.map((item, key) => (
          <View key={key} style={CreditCardStyles.panelItemInfo}>
            <Image
              style={CreditCardStyles.panelItemImg}
              source={item.img}
              resizeMode="contain"
            />
            <View style={CreditCardStyles.panelItemContainer}>
              <Text style={CreditCardStyles.panelItemTitle}>{item.title}</Text>
              <Text style={CreditCardStyles.panelItemDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </SlideUpPanel>
    );
  }

  render() {
    let _list_arr = [
      // {name:'name',label: this.i18n.cardUser,placeholder: this.i18n.nameRequire,maxlength:20,keyboard:'default',changeTextFunc: (value) => this._getName(value)},
      {
        name: "card",
        label: this.i18n.card,
        placeholder: this.i18n.cardRequire,
        maxlength: 19,
        keyboard: "numeric",
        changeTextFunc: value => this._getCard(value)
      },
      {
        name: "time",
        label: this.i18n.date,
        placeholder: this.i18n.timeRequire,
        maxlength: 4,
        keyboard: "numeric",
        changeTextFunc: value => this._getTime(value)
      },
      {
        name: "cvc",
        label: "CVC",
        placeholder: this.i18n.cvcRequire,
        maxlength: 3,
        keyboard: "numeric",
        changeTextFunc: value => this._getCVC(value)
      }
    ];
    return (
      <Container>
        <CommonHeader title={this.i18n.addCard} canBack />
        <View style={{ backgroundColor: "#efefef", flex: 1 }}>
          <View>{_list_arr.map((v, i) => this._renderCommonInput(v, i))}</View>
          <CommonBottomBtn clickFunc={() => this._bindCard()}>
            {this.i18n.addCardNow}
          </CommonBottomBtn>
          <TouchableOpacity
            style={CreditCardStyles.BottomInfoBtn}
            onPress={() => this.slideUpPanel._snapTo()}
          >
            <Icon style={CreditCardStyles.BottomInfoIcon} name="md-alert" />
            <Text style={CreditCardStyles.BottomInfoText}>支付安全需知</Text>
          </TouchableOpacity>
          {this._renderInfoDetailPanel()}
        </View>
      </Container>
    );
  }
}
