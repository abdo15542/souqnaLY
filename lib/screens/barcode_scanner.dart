import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
class BarcodeScannerPage extends StatefulWidget{const BarcodeScannerPage({super.key});@override State<BarcodeScannerPage>createState()=>_BarcodeScannerPageState();}
class _BarcodeScannerPageState extends State<BarcodeScannerPage>{
  final MobileScannerController _controller=MobileScannerController(detectionSpeed:DetectionSpeed.noDuplicates);
  bool _loading=true,_granted=false,_handled=false;String?_message;
  @override void initState(){super.initState();_requestPermission();}
  @override void dispose(){_controller.dispose();super.dispose();}
  Future<void>_requestPermission()async{setState(()=>{_loading=true;_message=null;});final status=await Permission.camera.request();if(!mounted)return;setState(()=>{_granted=status.isGranted;_loading=false;_message=_granted?null:'لم يتم منح إذن الكاميرا.';});}
  void _onDetect(BarcodeCapture capture){if(_handled)return;for(final b in capture.barcodes){final raw=b.rawValue;if(raw!=null&&raw.trim().isNotEmpty){_handled=true;Navigator.pop(context,raw.trim());return;}}}
  @override Widget build(BuildContext context){return Scaffold(appBar:AppBar(title:const Text('مسح الباركود')),body:_loading?const Center(child:CircularProgressIndicator()):!_granted?Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[const Icon(Icons.camera_alt,size:64,color:Colors.orange),const SizedBox(height:16),Text(_message??'يلزم إذن الكاميرا',textAlign:TextAlign.center),const SizedBox(height:16),FilledButton.icon(onPressed:_requestPermission,icon:const Icon(Icons.refresh),label:const Text('إعادة المحاولة'))]))):Stack(fit:StackFit.expand,children:[MobileScanner(controller:_controller,onDetect:_onDetect,errorBuilder:(c,e)=>const Center(child:Text('تعذر بدء الكاميرا.'))),Align(alignment:Alignment.bottomCenter,child:Container(margin:const EdgeInsets.all(24),padding:const EdgeInsets.symmetric(horizontal:16,vertical:10),decoration:BoxDecoration(color:Colors.black.withValues(alpha: 0.6),borderRadius:BorderRadius.circular(30)),child:const Text('وجّه الكاميرا نحو الباركود',style:TextStyle(color:Colors.white))))])]);}
}
